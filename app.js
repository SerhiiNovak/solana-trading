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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
