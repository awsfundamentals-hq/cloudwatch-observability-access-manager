/// <reference path="./.sst/platform/config.d.ts" />

//
// This is an example of how to create CloudWatch Observability Access Manager (OAM)
// Sinks and Links using the SST Ion https://ion.sst.dev/
//

// This example is a little manual and requires you to update the Source account IDs below

// Change the values below to match your Source account IDs
const awsAccountIdSourceA = '__UPDATE_ME_SOURCE_ACCOUT_A_ID__';
const awsAccountIdSourceB = '__UPDATE_ME_SOURCE_ACCOUT_B_ID__';

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

		//
		// Create a provider for each region we want to create the Sink to
		//
		const monitoringProvUsEast1 = new aws.Provider('monitoringProvUsEast1', {
			region: 'us-east-1',
		});
		const monitoringProvApSouthEast2 = new aws.Provider('monitoringProvApSouthEast2', {
			region: 'ap-southeast-2',
		});

		//
		// Create the Sink in each region in the Monitoring account
		// Create Sink Policy to allow Source accounts to attach to the Sink
		// Sink Policy is similar to Resource Policy
		//
		const monitoringSinkUsEast1 = new aws.oam.Sink(
			'MonitoringSinkUsEast1',
			{
				name: 'monitoringSinkUsEast1',
			},
			{
				provider: monitoringProvUsEast1,
			},
		);
		new aws.oam.SinkPolicy(
			'MonitoringSinkPolicyUsEast1',
			{
				sinkIdentifier: monitoringSinkUsEast1.arn,
				policy: createSinkPolicy(awsAccountIdSourceA, awsAccountIdSourceB),
			},
			{
				provider: monitoringProvUsEast1,
			},
		);

		const monitoringSinkApSouthEast2 = new aws.oam.Sink(
			'MonitoringSinkApSouthEast2',
			{
				name: 'monitoringSinkApSouthEast2',
			},
			{
				provider: monitoringProvApSouthEast2,
			},
		);
		new aws.oam.SinkPolicy(
			'MonitoringSinkPolicyApSouthEast2',
			{
				sinkIdentifier: monitoringSinkApSouthEast2.arn,
				policy: createSinkPolicy(awsAccountIdSourceA, awsAccountIdSourceB),
			},
			{
				provider: monitoringProvApSouthEast2,
			},
		);

		//
		// Create SourceA account provider for each region we want to create the Link to
		// Assume role "OrganizationAccountAccessRole" in SourceA account
		// Ensure the current credentials set in our environment can assume the role
		//
		const awsAssumeRoleSourceA = `arn:aws:iam::${awsAccountIdSourceA}:role/OrganizationAccountAccessRole`;
		const sourceAProvUsEast1 = new aws.Provider('sourceAProvUsEast1', {
			region: 'us-east-1',
			assumeRole: {
				roleArn: awsAssumeRoleSourceA,
			},
		});
		const sourceAApSouthEast2 = new aws.Provider('sourceAApSouthEast2', {
			region: 'ap-southeast-2',
			assumeRole: {
				roleArn: awsAssumeRoleSourceA,
			},
		});

		//
		// Create the Link in each region in the SourceA account
		// and attach it to the Sink in the Monitoring account in the same region
		//
		new aws.oam.Link(
			'SourceALinkUsEast1',
			{
				sinkIdentifier: monitoringSinkUsEast1.arn,
				labelTemplate: '$AccountName',
				resourceTypes: createLinkResourceTypes(),
			},
			{
				provider: sourceAProvUsEast1,
			},
		);

		new aws.oam.Link(
			'SourceALinkApSouthEast2',
			{
				sinkIdentifier: monitoringSinkApSouthEast2.arn,
				labelTemplate: '$AccountName',
				resourceTypes: createLinkResourceTypes(),
			},
			{
				provider: sourceAApSouthEast2,
			},
		);

		//
		// Create SourceB account provider for each region we want to create the Link to
		// Assume role "OrganizationAccountAccessRole" in SourceB account
		// Ensure the current credentials set in our environment can assume the role
		//
		const awsAssumeRoleSourceB = `arn:aws:iam::${awsAccountIdSourceB}:role/OrganizationAccountAccessRole`;
		const sourceBProvUsEast1 = new aws.Provider('sourceBProvUsEast1', {
			region: 'us-east-1',
			assumeRole: {
				roleArn: awsAssumeRoleSourceB,
			},
		});
		const sourceBApSouthEast2 = new aws.Provider('sourceBApSouthEast2', {
			region: 'ap-southeast-2',
			assumeRole: {
				roleArn: awsAssumeRoleSourceB,
			},
		});

		//
		// Create the Link in each region in the SourceB account
		// and attach it to the Sink in the Monitoring account in the same region
		//
		new aws.oam.Link(
			'SourceBLinkUsEast1',
			{
				sinkIdentifier: monitoringSinkUsEast1.arn,
				labelTemplate: '$AccountName',
				resourceTypes: createLinkResourceTypes(),
			},
			{
				provider: sourceBProvUsEast1,
			},
		);

		new aws.oam.Link(
			'SourceBLinkApSouthEast2',
			{
				sinkIdentifier: monitoringSinkApSouthEast2.arn,
				labelTemplate: '$AccountName',
				resourceTypes: createLinkResourceTypes(),
			},
			{
				provider: sourceBApSouthEast2,
			},
		);
	},
});

//
// For more information on Amazon CloudWatch Observability Access Manager:
// https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchobservabilityaccessmanager.html
//

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
