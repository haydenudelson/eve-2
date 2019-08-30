const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const https = require("https");
const fetch = require("node-fetch");
const grafana = require("./grafana");
const cron = require("./cron");
const multer = require("multer");
const links = require("./links");

dotenv.config();
const app = express();
const port = process.env.EVE_PORT || 3000;
const prod = process.env.NODE_ENV === "production";

const mediaDir = prod
  ? "/eve/carouselMedia"
  : path.join(process.cwd(), "eve/carouselMedia");

app.use(express.static(mediaDir));

/* URL */
const soaesb_url =
  "http://haart-kube.phx.connexta.com:3000/grafana/d/6hIxKFVZk/soa_dashboard?orgId=1";
const urlList = {
  SOAESB: soaesb_url
};

app.use(express.static("target"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

/* production setting */
const versionFileLocation = prod ? "/eve/versions.json" : "eve/versions.json";
const targetPath = prod ? "/target" : "../target";
const mediaFolder = prod ? "/eve/carouselMedia" : "eve/carouselMedia";
const mediaFile = prod ? "/eve/carousel.json" : "eve/carousel.json";

/* CRON JOB */
//CRON JOB for SOAESB grafana
// app.set("SOAESB", grafana.getScreenshot(prod, links.soaesb_url)); //initial run
// cron.grafanaCron(prod, app, links.soaesb_url);

// Create storage for media images
const storage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, mediaFolder);
  },
  filename: function(req, file, callback) {
    callback(null, file.originalname);
  }
});

// Multer package handles image storage
const upload = multer({
  storage: storage
}).array("imgUploader", 3);

/* ROUTE */
// Reads JSON data for carousel
app.get("/carousel", function(req, res) {
  if (fs.existsSync(mediaFile)) {
    let content = JSON.parse(fs.readFileSync(mediaFile));

    let route = content.routes.find(item => item.route === req.query.route);

    if (route == undefined) res.send({ cards: [] });
    else res.send({ cards: route.cards });
  } else res.send({ cards: [] });
});

// Posts JSON data from carousel
app.post("/carousel", function(req, res) {
  if (fs.existsSync(mediaFile)) {
    var content = JSON.parse(fs.readFileSync(mediaFile));

    let index;
    let route = content.routes.find((item, i) => {
      index = i;
      return item.route === req.body.route;
    });

    if (route == undefined) {
      content.routes.push({ route: req.body.route, cards: [req.body.card] });
    } else {
      route.cards.push(req.body.card);
      content.routes[index] = route;
    }

    fs.writeFileSync(mediaFile, JSON.stringify(content));
    res.end("Data sent successfully");
  } else {
    let content = {
      routes: [{ route: req.body.route, cards: [req.body.card] }]
    };

    fs.writeFileSync(mediaFile, JSON.stringify(content));
    res.end("Data sent successfully!");
  }
});

// Handles upload of images
app.post("/upload", function(req, res) {
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);

  upload(req, res, function(err) {
    if (err) {
      return res.end(err.toString());
    }
    return res.end("File uploaded successfully");
  });
});

//Handles deletion of images
app.post("/remove", function(req, res) {
  if (fs.existsSync(mediaFile)) {
    var content = JSON.parse(fs.readFileSync(mediaFile));

    let removed = req.body.card;
    let index;

    let route = content.routes.find((item, i) => {
      index = i;
      return item.route === req.body.route;
    });

    if (route != undefined) {
      content.routes[index].cards = route.cards.filter(
        card =>
          !(
            card.body == removed.body &&
            card.title == removed.title &&
            card.media == removed.media
          )
      );

      fs.writeFileSync(mediaFile, JSON.stringify(content));
    }

    let media = removed.media;
    if (media != null) {
      fs.unlink(mediaFolder + "/" + media, function(err) {
        if (err) {
          res.end(err.toString());
          return;
        } else {
          res.end("Card deleted successfully");
          return;
        }
      });
    }
  }

  res.end("No card to delete");
});

// Reads version data and sends to client
app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  const type = req.query.type;

  try {
    const response = await fetch(url);
    switch (type) {
      case "JSON":
        const json = await response.json();
        res.send(json);
        break;
      default:
        res.send(response);
    }
  } catch (error) {
    console.log("Error in /fetch ", error);
  }
  res.end();
});

app.get("/versions", function(req, res) {
  if (fs.existsSync(versionFileLocation)) {
    let content = fs.readFileSync(versionFileLocation);
    res.send(JSON.parse(content));
  } else {
    res.send({ GSR: "", Alliance: "", DDF: "" });
  }
});

// Writes version data from client
app.post("/versions", function(req, res) {
  fs.writeFileSync(versionFileLocation, JSON.stringify(req.body));
  res.end();
});

//image url to display created grafana screenshot
app.get("/display", async (req, res) => {
  try {
    const name = req.query.name.split("?")[0];
    const screenshotBuffer = await app.get(name);
    if (screenshotBuffer) {
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": screenshotBuffer.length
      });
      res.end(screenshotBuffer);
    } else {
      res.end();
    }
  } catch (error) {
    console.log("Error in /display ", error);
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, targetPath, "index.html"));
});

/* Deploy */
if (process.argv.length >= 2 && process.argv[2] === "https") {
  //DEV setup for HTTPS enviornment
  const options = {
    key: fs.readFileSync("./localhost.key"),
    cert: fs.readFileSync("./localhost.cert"),
    requestCert: false,
    rejectUnauthorized: false
  };
  const server = https.createServer(options, app);
  server.listen(port, () => {
    console.log(`App listening on https://localhost:${port}`);
  });
} else {
  //DEV setup for HTTP or production level
  app.listen(port, () => {
    console.log(`App listening on http://localhost:${port}`);
  });
}
