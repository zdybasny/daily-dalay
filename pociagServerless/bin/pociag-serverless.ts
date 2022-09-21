#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PociagServerlessStack } from '../lib/pociag-serverless-stack';

const app = new cdk.App();
new PociagServerlessStack(app, 'PociagServerlessStack', {
    env: { account: '', region: 'eu-central-1' },
    mail: '',
    trainLine: '',
    //hours and minutes should be in GMT+0, Poland is GMT+1 ;)
    cronOptions: {hour:'', minute: '', month: '*', year: '*', weekDay: '*'}
});``