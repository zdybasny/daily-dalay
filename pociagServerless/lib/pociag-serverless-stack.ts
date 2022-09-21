import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets'
import * as events from 'aws-cdk-lib/aws-events'


interface PociagStackProps extends StackProps {
  mail: string,
  trainLine: string,
  cronOptions: cdk.aws_events.CronOptions
}

export class PociagServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: PociagStackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'trainIsDelayedTopic', {
      displayName: 'Train is delayed topic',
    });

    topic.addSubscription(new subscriptions.EmailSubscription(props.mail));

    const queue = new sqs.Queue(this, 'pociagQueue');

    const checkIfTrainIsDelayedLambdaLayer = new lambda.LayerVersion(this, 'checkIfTrainIsDelayedLambdaLayer', {
      removalPolicy: RemovalPolicy.DESTROY,
      code: lambda.Code.fromAsset("resources/lambda/layers/checkIfTrainIsDelayedLayer"),
      compatibleArchitectures: [lambda.Architecture.X86_64, lambda.Architecture.ARM_64],
    });

    const policyWithAccessToSQS = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [queue.queueArn],
          actions: ['SQS:*'],
        })
      ],
    });

    const policyWithAccessToSNS = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [topic.topicArn],
          actions: ['SNS:*'],
        }),
      ],
    });

    const checkIfTrainIsDelayedLambdaRole  = new iam.Role(this, 'roleForCheckIfTrainsIsDelayedLambda', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        policyWithAccessToSQS
      },
    });

    const sendMessageToSNSLambdaRole  = new iam.Role(this, 'roleForSendMessageToSNSLambda', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        policyWithAccessToSQS, policyWithAccessToSNS
      },
    });

    const checkIfTrainIsDelayedLambda = new lambda.Function(this, 'checkIfTrainIsDelayedLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'check_If_train_Is_delayed.lambda_handler',
      code: lambda.Code.fromAsset("resources/lambda/checkIfTrainIsDelayed"),
      environment: {
        'TRAIN': props.trainLine,
        'QUEUE_URL': queue.queueUrl
      },
      timeout: cdk.Duration.seconds(90),
      role: checkIfTrainIsDelayedLambdaRole
    });

    checkIfTrainIsDelayedLambda.addLayers(checkIfTrainIsDelayedLambdaLayer);

    const sendMessageToSNSLambda = new lambda.Function(this, 'sendMessageToSNSLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'send_message_to_sns.handler',
      code: lambda.Code.fromAsset("resources/lambda/sendMessageToSns"),
      role: sendMessageToSNSLambdaRole,
      environment: {
        'TOPIC_ARN': topic.topicArn
      },
    })

    const sqsLambdaTrigger = new lambdaEventSources.SqsEventSource(queue);

    const eventRule = new events.Rule(this, 'scheduleRule', {
      schedule: events.Schedule.cron(props.cronOptions),
    });

    eventRule.addTarget(new eventTargets.LambdaFunction(checkIfTrainIsDelayedLambda))

    sendMessageToSNSLambda.addEventSource(sqsLambdaTrigger);
  }
}
