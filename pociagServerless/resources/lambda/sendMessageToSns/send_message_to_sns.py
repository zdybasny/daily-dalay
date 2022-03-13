import boto3
import os
import json
def handler(event, context):
    topic_arn = os.environ.get("TOPIC_ARN")
    sns_client = boto3.client('sns')
    minutes = event['Records'][0]['body']
    response = sns_client.publish(
        TopicArn=topic_arn,
        Message=bodyTemplate(minutes),
        Subject=subjectTemplate(minutes)
    )
    return {
        'statusCode': 200,
        'body': json.dumps(response)
    }
def bodyTemplate(minutes):
    return "Your train is delayed by " + minutes + "minutes. TROLOLOLOLOLO"
def subjectTemplate(minutes):
    return "[PKP]" + minutes