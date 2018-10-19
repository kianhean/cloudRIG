exports.handler = (event, context, callback) => {

    var commonlib = require("cloudrigLambdaCommon");
    var common = new commonlib(eventBody);
    var AWS = require("aws-sdk");
    var sns = new AWS.SNS();
    var ec2 = new AWS.EC2();
    var cloudwatchevents = new AWS.CloudWatchEvents();


    var eventBody = JSON.parse(event.Records[0].Sns.Message);
    var lambdaARNQueue = eventBody.lambdaARNQueue;


    function run() {

        common.report("Getting EBS Volume");

        ec2.describeVolumes(
            {
                Filters: common.standardFilter
            },
            function (err, data) {
                if (err) {
                    common.report(err);
                    return;
                }

                var volumes = data.Volumes.filter(function (v) {
                    return v.AvailabilityZone === eventBody.state.availabilityZone;
                });

                // Exists
                if (volumes[0]) {
                    common.report("Found EBS Volume");

                    eventBody.state.volumeId = volumes[0].VolumeId;

                    ec2.attachVolume(
                        {
                            Device: "xvdb",
                            InstanceId: eventBody.state.instance.InstanceId,
                            VolumeId: eventBody.state.volumeId
                        },
                        function (err, data) {
                            if (err) {
                                common.report(err);
                                return;
                            }
                            triggerNextLambda(lambdaARNQueue, eventBody);
                        }
                    );
                } else {
                    common.report("Did not find EBS Volume");
                    triggerNextLambda(lambdaARNQueue, eventBody);

                }

            }
        );
    }

    common.start(run, eventBody);



}