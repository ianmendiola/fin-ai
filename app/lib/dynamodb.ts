import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import type { MonthlySummary, StoredTransactions } from "./types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function tableName() {
  return Resource.Table.name;
}

export async function putSummary(summary: MonthlySummary) {
  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk: "SUMMARY",
        sk: `MONTH#${summary.month}`,
        ...summary,
      },
    })
  );
}

export async function getAllSummaries(): Promise<MonthlySummary[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": "SUMMARY",
        ":prefix": "MONTH#",
      },
    })
  );

  return (result.Items ?? []).map((item) => ({
    month: item.month as string,
    grocery: item.grocery as number,
    general: item.general as number,
    splurge: item.splurge as number,
    amex: item.amex as number,
    appleCard: item.appleCard as number,
    wifeCC: item.wifeCC as number,
    direct: item.direct as number,
    totalSpent: item.totalSpent as number,
    totalIncome: item.totalIncome as number,
    savings: item.savings as number,
    updatedAt: item.updatedAt as string,
  }));
}

export async function putTransactions(data: StoredTransactions) {
  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk: "TRANSACTIONS",
        sk: `MONTH#${data.month}`,
        month: data.month,
        checking: data.checking,
        creditCards: data.creditCards,
      },
    })
  );
}

export async function getAllTransactions(): Promise<StoredTransactions[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": "TRANSACTIONS",
        ":prefix": "MONTH#",
      },
    })
  );

  return (result.Items ?? []).map((item) => ({
    month: item.month as string,
    checking: item.checking as StoredTransactions["checking"],
    creditCards: item.creditCards as StoredTransactions["creditCards"],
  }));
}

export async function deleteSummary(month: string) {
  await client.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: {
        pk: "SUMMARY",
        sk: `MONTH#${month}`,
      },
    })
  );
}

export async function deleteTransactions(month: string) {
  await client.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: {
        pk: "TRANSACTIONS",
        sk: `MONTH#${month}`,
      },
    })
  );
}

export async function getMemories(): Promise<string[]> {
  const result = await client.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        pk: "MEMORY",
        sk: "ALL",
      },
    })
  );

  return (result.Item?.memories as string[]) ?? [];
}

export async function putMemories(memories: string[]) {
  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: {
        pk: "MEMORY",
        sk: "ALL",
        memories,
      },
    })
  );
}
