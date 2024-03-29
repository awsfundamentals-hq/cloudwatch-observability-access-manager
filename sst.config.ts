/// <reference path="./.sst/platform/config.d.ts" />

//
// This is an example of how to create CloudWatch Observability Access Manager (OAM)
// Sinks and Links using the SST Ion https://ion.sst.dev/
//

// This example is a little manual on purpose and requires you to update the Source account IDs below

// Change the values below to match your Source account IDs
const source_a_awsAccountId = '__UPDATE_ME__AWS_ACCOUNT_ID_SOURCE_A__';
const source_a_roleName = 'OrganizationAccountAccessRole';
const source_a_roleArn = `arn:aws:iam::${source_a_awsAccountId}:role/${source_a_roleName}`;

const source_b_awsAccountId = '__UPDATE_ME__AWS_ACCOUNT_ID_SOURCE_B__';
const source_b_roleName = 'OrganizationAccountAccessRole';
const source_b_roleArn = `arn:aws:iam::${source_b_awsAccountId}:role/${source_b_roleName}`;

//
// We use the AWS credentials available in the environment and trust it is pointing
// to the Monitoring account (e.g. AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY or AWS_PROFILE)
//
// Running `sst deploy` will target the Monitoring account first to create the Sinks
// and we create providers in Source accounts to create the Links
//
// The Source account provider is assuming the role "OrganizationAccountAccessRole"
// We expect the role to exist and have the necessary permissions to create the Link
//
// If you create the Source accounts via AWS Organizations without customizations
// The "OrganizationAccountAccessRole" role will be created automatically
//
export default $config({
    app(input) {
        const projectId = 'cloudwatch-observability-access-manager';
        return {
            name: projectId,
            removal: 'remove',
            home: 'aws',
            providers: {
                aws: {
                    defaultTags: {
                        tags: {
                            ProjectId: projectId,
                            Framework: 'ion-sst',
                        },
                    },
                },
            },
        };
    },
    async run() {
        createCloudWatchOAMResourcesForRegion('us-east-1');

        createCloudWatchOAMResourcesForRegion('ap-southeast-2');
        //
        // For more information on Amazon CloudWatch Observability Access Manager:
        // https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchobservabilityaccessmanager.html
        //
    },
});

function createCloudWatchOAMResourcesForRegion(awsRegion: aws.types.enums.Region) {
    const suffixAwsRegion = awsRegion.replace(/-/g, ''); // "us-east-1" => "useast1"

    //
    // Create a provider for the Monitoring account in the target region
    // Use the default credentials available in the environment
    //
    const monitoringProv = new aws.Provider(`monitoringProv${suffixAwsRegion}`, {
        region: awsRegion,
    });

    //
    // Create the Sink in the target region in the Monitoring account
    //
    const monitoringSink = new aws.oam.Sink(
        `MonitoringSink${suffixAwsRegion}`,
        {
            name: `monitoringSink${suffixAwsRegion}`,
        },
        {
            provider: monitoringProv,
        },
    );
    //
    // Create the Sink Policy to allow Source accounts to attach to the Sink
    // Sink Policy is similar to Resource Policy
    //
    new aws.oam.SinkPolicy(
        `MonitoringSinkPolicy${suffixAwsRegion}`,
        {
            sinkIdentifier: monitoringSink.arn,
            policy: createSinkPolicy(source_a_awsAccountId, source_b_awsAccountId),
        },
        {
            provider: monitoringProv,
        },
    );

    //
    // Create SourceA account provider for the target region we want to create the Link to
    // Assume role "OrganizationAccountAccessRole" in SourceA account
    // !!! Reminder: The current credentials set in our environment must be able to assume the role
    //
    const source_a_Prov = new aws.Provider(`source_a_Prov${suffixAwsRegion}`, {
        region: awsRegion,
        assumeRole: {
            roleArn: source_a_roleArn,
        },
    });
    //
    // Create the Link in the target region in the SourceA account
    // and attach it to the Sink in the Monitoring account in the same region
    //
    new aws.oam.Link(
        `SourceALink${suffixAwsRegion}`,
        {
            sinkIdentifier: monitoringSink.arn,
            labelTemplate: '$AccountName',
            resourceTypes: createLinkResourceTypes(),
        },
        {
            provider: source_a_Prov,
        },
    );

    //
    // Create SourceB account provider for the target region we want to create the Link to
    // Assume role "OrganizationAccountAccessRole" in SourceB account
    // !!! Reminder: The current credentials set in our environment must be able to assume the role
    //
    const source_b_Prov = new aws.Provider(`source_b_Prov${suffixAwsRegion}`, {
        region: awsRegion,
        assumeRole: {
            roleArn: source_b_roleArn,
        },
    });
    //
    // Create the Link in the target region in the SourceA account
    // and attach it to the Sink in the Monitoring account in the same region
    //
    new aws.oam.Link(
        `SourceBLink${suffixAwsRegion}`,
        {
            sinkIdentifier: monitoringSink.arn,
            labelTemplate: '$AccountName',
            resourceTypes: createLinkResourceTypes(),
        },
        {
            provider: source_b_Prov,
        },
    );
}

//
// For more information on Link and Link Resource Types:
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-oam-link.html
//
function createLinkResourceTypes() {
    return ['AWS::ApplicationInsights::Application', 'AWS::CloudWatch::Metric', 'AWS::Logs::LogGroup', 'AWS::XRay::Trace'];
}

//
// For more information on Sink Policy:
// https://docs.aws.amazon.com/OAM/latest/APIReference/API_PutSinkPolicy.html
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-oam-sink.html
//
function createSinkPolicy(...awsAccountIds: string[]) {
    return JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Action: ['oam:CreateLink', 'oam:UpdateLink'],
                Effect: 'Allow',
                Resource: '*',
                Principal: {
                    AWS: [...awsAccountIds],
                },
                Condition: {
                    'ForAllValues:StringEquals': {
                        'oam:ResourceTypes': [
                            'AWS::ApplicationInsights::Application',
                            'AWS::CloudWatch::Metric',
                            'AWS::Logs::LogGroup',
                            'AWS::XRay::Trace',
                        ],
                    },
                },
            },
        ],
    });
}

//
// Gotchas:
//   - I'm not sure if it is Pulumi or SST Ion, but
//   - The unique name for components `oam.Sink(name, ...)`, `oam.SinkPolicy(name, ...)`, and `oam.Link(name, ...)`
//   - Is not accepting underline "_" or dash "-" or starting with lowercase in the name
//   - It throws the error: "Component names must start with an uppercase letter and contain only alphanumeric characters."
//   - This doesn't happen in Terraform
//   - I was unable to create a prefix pattern across the resources
//   - We have a mix of "Provider(`monitoring...", "new aws.oam.Link(`SourceB...", "new aws.Provider(`source_b..."
//   - And the region suffix is glued to the end "monitoringSinkuseast1", "SourceALinkuseast1", "source_b_Provuseast1"
//   - Ideally, we would have a pattern "monitoringSink-useast1", "sourceALink-useast1", "sourceBProv-useast1"
//
