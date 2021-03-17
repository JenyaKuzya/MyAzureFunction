jest.mock('axios');

const MockConfiguration = {
    start: jest.fn()
};

jest.mock('applicationinsights', () => {
	return {
		setup: jest.fn().mockImplementation(() => MockConfiguration),
		defaultClient: {
			trackTrace: jest.fn(),
			trackException: jest.fn(),
			trackEvent: jest.fn()
		}
	}
});

const appInsightsMock = require('applicationinsights');
const httpFunction = require('./index');
const context = require('../testing/defaultContext');
const axios = require('axios');

beforeEach(() => {
    context.log.mockClear();
    axios.post.mockReset();
    axios.put.mockReset();
});

test('Purchase should return success', async () => {

    let response = {
        "data": {
            "transactionIdentifier": "test",
            "data":{
                "payeezy": {
                    "transaction_tag": "test"
                }
            }
        }
    };

    axios.post.mockImplementation(() => Promise.resolve(response));
    axios.put.mockImplementation(() => Promise.resolve());

    const request = {
        body: { amount: '11' }
    };

    await httpFunction(context, request);

    expect(axios.post.mock.calls.length).toBe(1);
    expect(axios.put.mock.calls.length).toBe(1);
    expect(context.log.mock.calls.length).toBe(1);
    expect(context.log.mock.calls[0][0]).toEqual('Purchase was successful.');
});

test('Should failed with preauth error', async () => {

    axios.post.mockImplementation(() => Promise.reject());

    const request = {
        body: { amount: '11' }
    };

    expect(async () => {await httpFunction(context, request)}).rejects.toMatch('Preauth request was failed.');

    expect(axios.post.mock.calls.length).toBe(1);
    expect(axios.post).rejects.toMatch('Preauth request was failed.');
});

test('Should failed with capture error', async () => {

    let response = {
        "data": {
            "transactionIdentifier": "test",
            "data":{
                "payeezy": {
                    "transaction_tag": "test"
                }
            }
        }
    };

    axios.put.mockImplementation(() => Promise.reject());
    axios.post.mockImplementation(() => Promise.resolve(response));
    
    const request = {
        body: { amount: '11' }
    };

    expect(async () => {await httpFunction(context, request)}).rejects.toMatch('Capture request was failed.');

    expect(axios.put.mock.calls.length).toBe(1);
    expect(axios.put).rejects.toMatch('Capture request was failed.');
});