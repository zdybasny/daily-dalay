import aiohttp
import boto3
import asyncio
from bs4 import BeautifulSoup

async def get_train_page(session, url):
    async with session.get(url) as resp:
        page = await resp.text()
        return page
train_to_check = '6302abc'
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
        for page_idx in range(1, 25):
            url = f"https://portalpasazera.pl/Opoznienia/Index?s=4&p={page_idx}"
            train_pages.append(asyncio.ensure_future(get_train_page(session, url)))

        original_pages = await asyncio.gather(*train_pages)
        for page in original_pages:
            format_data(page)

def handler(event, context):
    # asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
    print("testabc")
    return {
        'statusCode': 200,
        'body': trains.get(train_to_check) 
    }

Opóźnienia i utrudnienia - Wszystkie aktualne - Portal Pasażera - PKP Polskie Linie Kolejowe S.A.
Wszystkie aktualne opóźnienia i utrudnienia dla pociągów pasażerskich w Polsce.

