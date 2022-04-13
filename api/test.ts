const axios = require("axios");
const waiter = require("flag-waiter");

import Shopify, { ApiVersion } from "@shopify/shopify-api";

var SHOP = "https://xn-czru2d0x4bc9l9wp0sp.myshopify.com/";
var API_KEY = "2d1280e20e7107714def1e299e75a59a";
var API_SECRET_KEY = "71dfd560e06bbac68a73435897d04308";
var SCOPES = [
  "read_customers",
  " read_inventory",
  "read_orders",
  "read_products",
];
var HOST = "test-serverless-api-vercel.vercel.app";

Shopify.Context.initialize({
  API_KEY,
  API_SECRET_KEY,
  SCOPES: SCOPES,
  HOST_NAME: HOST.replace(/https:\/\//, ""),
  IS_EMBEDDED_APP: false,
  API_VERSION: ApiVersion.April22, // all supported versions are available, as well as "unstable" and "unversioned"
});

const ACTIVE_SHOPIFY_SHOPS: { [key: string]: string | undefined } = {};
