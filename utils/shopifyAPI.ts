import axios from "axios";
// import { getOrdersByDateRange } from "./shopifyAPI.js";

const config: any = {
  headers: {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": process.env.access_token,
  },
};

export async function queryOrdersByDateRange(
  startDate: string,
  endDate: string
) {
  let bulkOperation = await axios.post(
    "https://chyuinding.myshopify.com/admin/api/2022-04/graphql.json",
    {
      query: ` 
                    mutation {
                        bulkOperationRunQuery(
                         query: """
                         query shopinfo
                         {
                             orders(first:10000, query:"created_at:>${startDate} created_at:<${endDate}"){
                                 edges {
                                     cursor
                                     node {
                                        id
                                        name
                                        fullyPaid
                                         customer {
                                             displayName 
                                             email 
                                         }
                                         createdAt 
                                         customAttributes{
                                             key
                                             value
                                         }
                                         currentTotalPriceSet{
                                             shopMoney {
                                                 amount 
                                             }
                                         }
                                         lineItems {
                                          edges {
                                            node {
                                              title
                                              quantity
                                              sku
                                              variant{
                                                id
                                              }
                                            }
                                          }
                                        }
                                        unpaid 
                                     }
                                 }
                             }
                         }
                          """
                        ) {
                          bulkOperation {
                            id
                            status
                          }
                          userErrors {
                            field
                            message
                          }
                        }
                      }
                    `,
    },
    config
  );
  console.log(bulkOperation.data.data);
  return bulkOperation.data.data.bulkOperationRunQuery;
}

export async function getBulkOperationStatus(id: any) {
  let result = await axios.post(
    "https://chyuinding.myshopify.com/admin/api/2022-04/graphql.json",
    {
      query: ` 
          query {
              node(id: "${id}") {
                ... on BulkOperation {
                  id
                  status
                  errorCode
                  createdAt
                  completedAt
                  objectCount
                  fileSize
                  url
                  partialDataUrl
                }
              }
            }
          `,
    },
    config
  );
  let node = result.data.data.node;
  return node;
}

export async function queryAllProducts() {
  let bulkOperation = await axios.post(
    "https://chyuinding.myshopify.com/admin/api/2022-04/graphql.json",
    {
      query: ` 
                    mutation {
                        bulkOperationRunQuery(
                         query: """
                         query shopinfo
                         {
                          products(first:10000) {
                            edges {
                              node {
                                id
                                variants(first: 10) {
                                  edges {
                                    node {
                                      id
                                      sku
                                      price
                                      displayName
                                    }
                                  }
                                }
                              }
                            }
                          }
                         }
                          """
                        ) {
                          bulkOperation {
                            id
                            status
                          }
                          userErrors {
                            field
                            message
                          }
                        }
                      }
                    `,
    },
    config
  );
  console.log(bulkOperation.data.data);
  console.log(bulkOperation.data.data.bulkOperationRunQuery.userErrors);

  return bulkOperation.data.data.bulkOperationRunQuery;
}
