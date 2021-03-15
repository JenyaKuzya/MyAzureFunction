module.exports = async function (context, req) {
    
    let appInsights = require('applicationinsights');
    appInsights.setup()
        .start();

    const { QueueClient, QueueServiceClient } = require("@azure/storage-queue");
    const fetch = require("node-fetch");

    try
    {
        let amount = req.body.amount;
        let baseURL = 'https://apim-racetrac-dev.azure-api.net/payments/v1/transactions';
        let preauthResponse = await fetch(baseURL, 
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(
            {
                "amount": amount,
                "data": {
                "payeezy": {
                    "gateway": "fuelVip",
                    "cardToken": {
                    "tokenValue": "2537446225198291",
                    "cardType": "visa",
                    "cardholderName": "JohnSmith",
                    "expirationDate": "1030"
                    }
                }
                }
            })
        });

        if (!preauthResponse.ok)
        {
            context.log.error("Preauth request was failed. Status code " + preauthResponse.status); 
            throw new Error("Preauth request was failed.");
        }

        let preauthResponseText = await preauthResponse.json();
        let transactionIdentifier = preauthResponseText.transactionIdentifier;
        let transactionTag = preauthResponseText.data.payeezy.transaction_tag;

        let captureResponse = await fetch(baseURL + '/' + transactionIdentifier, 
        {
            method: 'PUT',
            headers: {
            'Content-Type': 'application/json;charset=utf-8',
            'transactionType': 'capture'
            },
            body: JSON.stringify(
                {
                    "amount": amount,
                    "data": {
                      "payeezy": {
                        "gateway": "fuelVip",
                        "transactionTag": transactionTag
                      }
                    }
                })
        });

        if (!captureResponse.ok)
        {
            context.log.error("Capture request was failed. Status code " + captureResponse.status); 
            throw new Error("Capture request was failed.");
        }
    }
    catch(exception)
    {
        context.log.error("Purchase was failed.");
        throw exception;
    }

    context.log("Purchase was successful.");
    
    const StorageConnectionString = process.env["AzureWebJobsStorage"];
    const queueServiceClient = QueueServiceClient.fromConnectionString(StorageConnectionString);
    const queueClient = queueServiceClient.getQueueClient("fuelsubscriptionqueue");
    
    await queueClient.sendMessage("Purchase was successful.");
}