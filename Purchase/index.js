module.exports = async function (context, req) {
    
    let appInsights = require('applicationinsights');
    appInsights.setup()
        .start();

    const { QueueClient, QueueServiceClient } = require("@azure/storage-queue");
    const axios = require('axios');

    try
    {
        let amount = req.body.amount;
        let baseURL = 'https://apim-racetrac-dev.azure-api.net/payments/v1/transactions';

        let preauthResponse = await axios.post(baseURL, 
        {
            amount: amount,
            data: {
                payeezy: {
                    gateway: "fuelVip",
                    cardToken: {
                        tokenValue: "2537446225198291",
                        cardType: "visa",
                        cardholderName: "JohnSmith",
                        expirationDate: "1030"
                    }
                }
            }
        })
        .catch(function (error) {
            context.log.error("Preauth request was failed. Status code " + error.response.status); 
            throw new Error("Preauth request was failed.");
        });

        let transactionIdentifier = preauthResponse.data.transactionIdentifier;
        let transactionTag = preauthResponse.data.data.payeezy.transaction_tag;

        axios.put(baseURL + '/' + transactionIdentifier, 
        {
            amount: amount,
            data: {
              payeezy: {
                gateway: "fuelVip",
                transactionTag: transactionTag
              }
            }
        },
        {
            headers: { 
                'Content-Type': 'application/json;charset=utf-8',
                'transactionType': 'capture' 
            }
        })
        .catch(function (error) {
            context.log.error("Capture request was failed. Status code " + error.response.status); 
            throw new Error("Capture request was failed.");
        });
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