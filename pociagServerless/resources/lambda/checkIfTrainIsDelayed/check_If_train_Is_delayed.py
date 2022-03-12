import aiohttp
import json
import boto3
import os
import asyncio
from bs4 import BeautifulSoup
async def get_train_page(session, url):
    async with session.get(url) as resp:
        page = await resp.text()
        return page
train_to_check = os.environ.get("TRAIN")
sqs_queue_url = os.environ.get("QUEUE_URL")
trains = {}
def format_data(page):
    soup = BeautifulSoup(page, 'html.parser')
    delays_table = soup.findAll('div', {'class': 'delays-table'})
    records = delays_table[0].findAll('div', attrs={'class': 'delays-table__row'})
    # records are available from 0 - 5
    for idx in range(len(records)):
        train_infos = records[idx].findAll('strong')
        trains.update({train_infos[1].text: train_infos[3].text})
async def main():
    async with aiohttp.ClientSession() as session:
        train_pages = []
        for page_idx in range(1, 1):
            url = f"https://portalpasazera.pl/Opoznienia/Index?s=4&p={page_idx}"
            train_pages.append(asyncio.ensure_future(get_train_page(session, url)))
        original_pages = await asyncio.gather(*train_pages)
        for page in original_pages:
            format_data(page)
def send_sqs_message(msg_body):
    # Send the SQS message
    sqs_client = boto3.client('sqs')
    msg = sqs_client.send_message(QueueUrl=sqs_queue_url,MessageBody=msg_body)
    return msg
def lambda_handler(event, context):
    # Send some SQS messages
    asyncio.run(main())
    find_delay = trains.get(train_to_check)
    if find_delay is None:
        msg = 'Pociąg nie jest opóźniony'
    elif "min" in find_delay:
        # opóźniony o x minut
        msg = "Pociąg jest opóźniony o " + find_delay
    else:
        # odwołany lub odwołany na części trasy
        msg = "Pociąg jest" + find_delay.lower()
    msg = send_sqs_message( msg )
    # TODO implement
    return {
        'body': msg
    }