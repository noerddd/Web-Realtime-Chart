//import express sebagai webserver
const express = require("express");

//setting webServer
const webServer = express();

//buat variable port
const port = 3000;

//import web socket
const WebSocket = require("ws");
//instansiasi web socket
const server = new WebSocket.Server({ port: 443 });

//import mongodb dan koneksikan web server ke mongodb
const { MongoClient } = require("mongodb");
const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);

//buat API untuk menampilkan script html form
webServer.get("/form", (req, res) => {
  res.sendFile("/form.html", { root: __dirname });
});

//buat API untuk menampilkan script html chart
webServer.get("/chart", (req, res) => {
  res.sendFile("chart.html", { root: __dirname });
});

//test webServer
webServer.listen(port, () => {
  console.log(`web server listening on port ${port}`); //jangan lupa gunakan tanda baktik buka petik
});

//gunakan event on untuk cek client yang terkoneksi ke websocket
server.on("connection", (ws) => {
  console.log("new client connected");
  //buat fungsi untuk mengambil data dari mongodb
  async function getSales() {
    try {
      //koneksikan server ke database mongodb
      await client.connect();
      const data = await client
        .db("realtime")
        .collection("sales")
        .find({})
        .toArray();

      //kirim semua data pada database ke client yang terkonek ke websocket
      server.clients.forEach((e) => {
        e.send(JSON.stringify(data));
      });
    } finally {
      //setelah mengambil semua data akhiri koneksi
      client.close();
    }
  }

  //membuat kondisi menjalankan fungsi getSales ketika message berstatus load
  ws.on("message", (message) => {
    switch (JSON.parse(message).type) {
      case "load":
        getSales();
        break;
      //membuat kondisi menjalankan fungsi addSales ketika message berstatus add
      case "add":
        async function addSales() {
          try {
            const docs = await JSON.parse(message);
            await client.connect();
            await client
              .db("realtime")
              .collection("sales")
              .insertOne({ tanggal: docs.tanggal, sales: docs.sales });
          } finally {
            client.close();
          }
        }
        addSales().then(() => {
          getSales();
        });
        break;

      //membuat kondisi menjalankan fungsi editSales ketika message berstatus edit
      case "edit":
        async function editSales() {
          try {
            const docs = await JSON.parse(message);
            await client.connect();
            await client
              .db("realtime")
              .collection("sales")
              .updateOne(
                { tanggal: docs.tanggal },
                { $set: { sales: docs.sales } }
              );
          } finally {
            client.close();
          }
        }
        editSales().then(() => {
          getSales();
        });
        break;
    }
  });
});
