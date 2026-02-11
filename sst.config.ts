// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "fin-ai",
      removal: "remove",
      protect: false,
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    const command = await import("@pulumi/command");

    const openRouterKey = new sst.Secret("OpenRouterKey");
    const googleClientId = new sst.Secret("GoogleClientId");
    const googleClientSecret = new sst.Secret("GoogleClientSecret");
    const authSecret = new sst.Secret("AuthSecret");
    const allowedEmail = new sst.Secret("AllowedEmail");

    const table = new sst.aws.Dynamo("Table", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    });

    const site = new sst.aws.Nextjs("MyWeb", {
      dev: {
        command: "next dev",
        url: "http://localhost:3000",
      },
      server: {
        url: {
          authorization: "none",
        },
      },
      link: [table, openRouterKey],
      environment: {
        GOOGLE_CLIENT_ID: googleClientId.value,
        GOOGLE_CLIENT_SECRET: googleClientSecret.value,
        AUTH_SECRET: authSecret.value,
        ALLOWED_EMAIL: allowedEmail.value,
      },
    });

    if (!$dev) {
      // Required since October 2025: Lambda Function URLs need both
      // lambda:InvokeFunctionUrl AND lambda:InvokeFunction permissions
      new aws.lambda.Permission("ServerPublicInvoke", {
        function: site.nodes.server.nodes.function.name,
        action: "lambda:InvokeFunction",
        principal: "*",
      });

      const imageOptimizerPrefix = $interpolate`${$app.name}-${$app.stage}-MyWebImageOptimizerFunction`;

      new command.local.Command("ImageOptimizerPublicInvoke", {
        create: $interpolate`FUNC=$(aws lambda list-functions --query "Functions[?starts_with(FunctionName, '${imageOptimizerPrefix}')].FunctionName" --output text --region us-east-1) && aws lambda add-permission --function-name $FUNC --statement-id AllowPublicInvoke --action lambda:InvokeFunction --principal "*" --region us-east-1 2>/dev/null || echo "Permission may already exist"`,
      }, { dependsOn: [site] });
    }
  },
});
