require("dotenv").config();
const express = require("express");
const {
  Connection,
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  SystemProgram,
  PublicKey,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const bs58 = require("bs58");
const axios = require("axios");
const qs = require("qs");

const SOL_ID = 5426;

const cmcOption = {
  baseURL: "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
  headers: { "X-CMC_PRO_API_KEY": "5485dc90-652a-4405-b793-4c09b538edef" },
};

const birdEyeOption = {
  baseURL: "https://public-api.birdeye.so/defi/history_price",
  headers: {
    "x-chain": "solana",
    "X-API-KEY": "ba4231b1eaf24124936d74c319f02477",
  },
};

const app = express();
app.use(express.json());

// Add web3 connection
const connection = new Connection(process.env.RPC);

// Add keypair
const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));

// Check wallet balance
app.get("/check-balances", async (_, res) => {
  const balance = await connection.getBalance(keyPair.publicKey);

  res.json({ balance: balance / LAMPORTS_PER_SOL }).status(200);
});

// Send balance
app.post("/send-balances", async (req, res) => {
  const {
    body: { amount },
  } = req;
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keyPair.publicKey,
      toPubkey: process.env.RECIPIENT_ADDRESS,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      keyPair,
    ]);

    const receiverBalance = await connection.getBalance(
      new PublicKey(process.env.RECIPIENT_ADDRESS)
    );

    const myBalance = await connection.getBalance(keyPair.publicKey);

    res
      .json({
        signature,
        receiverBalance: receiverBalance / LAMPORTS_PER_SOL,
        myBalance: myBalance / LAMPORTS_PER_SOL,
      })
      .status(200);
  } catch (error) {
    console.error("###Trade Error###" + error);
    res.json({ error: "Trade error" }).status(500);
  }
});

// Get solana crypto price
app.get("/sol-price", async (_, res) => {
  try {
    const result = await axios.get("", {
      ...cmcOption,
      params: { id: SOL_ID, convert: "USD" },
    });
    const solPrice = result.data.data[SOL_ID].quote.USD.price;
    res.json({ price: solPrice }).status(200);
  } catch (error) {
    console.error("###Catch Error###" + error);
    res.json({ error: "Catch error" }).status(500);
  }
});

// Get transactions of specific token address
app.get("/get-transactions", async (_, res) => {
  try {
    let resultArray = [];
    const now = Math.round(new Date().getTime() / 1000);
    const from = now - 15 * 60;
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey("st8QujHLPsX3d6HG9uQg9kJ91jFxUgruwsb1hyYXSNd")
    );

    const lastestSings = signatures.filter(
      (sign) => sign.blockTime && sign.blockTime >= from
    );
    const info = await connection.getParsedTransaction(
      lastestSings[0].signature,
      {
        maxSupportedTransactionVersion: 0,
      }
    );

    for (sing of lastestSings) {
      const info = await connection.getParsedTransaction(
        lastestSings[0].signature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );

      const preTotal = getTotal(info.meta.preBalances);
      const postTotal = getTotal(info.meta.postBalances);

      const deltaAmount = postTotal - preTotal;

      resultArray = [...resultArray, { balance: deltaAmount }];
    }
    res.json({ result: resultArray }).status(200);
  } catch (error) {
    console.error("###Catch Error###" + error);
    res.json({ error: "Catch error" }).status(500);
  }
});

function getTotal(array) {
  let total = 0;
  for (i of array) {
    total += i;
  }

  return total;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
