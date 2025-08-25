// socketHandler.js
const FormData = require("form-data");
const axios = require("axios");


global.userSessions = {}; // { userId: [socketId1, socketId2] }

function registerSocket(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Timeout handler (10 min = 600000 ms)
    const disconnectTimer = setTimeout(() => {
      console.log(`Auto-disconnecting socket ${socket.id} after 10 mins`);
      socket.disconnect(true); // force disconnect
    }, 10 * 60 * 1000);

    // Step 1: Register after login
    socket.on("register", (userId) => {
      if (!global.userSessions[userId]) {
        global.userSessions[userId] = [];
      }
      global.userSessions[userId].push(socket.id);
      socket.userId = userId;
      console.log(`User ${userId} connected on socket ${socket.id}`);
    });

    // Step 2: Web -> Mobile screenshot request
    socket.on("takeScreenshot", (userId) => {
      console.log(
        `takeScreenshot request: User ${userId} connected on socket ${socket.id}`
      );
      if (global.userSessions[userId]) {
        global.userSessions[userId].forEach((sockId) => {
          if (sockId !== socket.id) {
            io.to(sockId).emit("takeScreenshotRequest");
            console.log(
              `takeScreenshot request sent to: User ${userId} connected on socket ${socket.id}`
            );
          }
        });
      }
    });

  // Step 3: Mobile -> Web screenshot data
  socket.on("screenshotTaken", async (data) => {
    const imageDetails = data.imageBase64;
    let obj = new Object();
    let imgDetArr = [];
    for (let i = 0; i < imageDetails.length; i++) {
      obj = new Object();
      obj.img = imageDetails[i];
      const imageExtractedText=await processBase64Image(imageDetails[i], {
        env: { LOG_LEVEL: "DEBUG" },
        logHeaderId: "12345",
        patientId: "P001",
      });
      obj.extractText = imageExtractedText?.textResp?.responses[0]??"";
      obj.textresp=imageExtractedText?.textResp;
      obj.processedImg=imageExtractedText?.processedImg;

      imgDetArr.push(obj);
    }
    console.log("screenshotTaken function inside");
    if (global.userSessions[data.userId]) {
      global.userSessions[data.userId].forEach((sockId) => {
        if (sockId !== socket.id) {
          io.to(sockId).emit("screenshotReceived", imgDetArr);
          console.log(
            "screenshotTaken function inside web",
            data.imageBase64
          );
        }
      });
    }
  });

    // Step 4: Cleanup
    socket.on("unregister", (userId) => {
      clearTimeout(disconnectTimer);
      if (userId) {
        global.userSessions[userId] = global.userSessions[userId].filter(
          (id) => id !== socket.id
        );
        if (global.userSessions[userId].length === 0) {
          delete global.userSessions[userId];
        }
      }
      console.log("Client disconnected:", socket.id);
    });
  });
}

async function processBase64Image(base64Data, options = {}) {
  try {
    // Strip metadata if present (data:image/jpeg;base64,....)
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // 1. Build FormData for file upload
    const formData = new FormData();
    formData.append("files", buffer, {
      filename: `image_${Date.now()}.jpg`,
      contentType: "image/jpeg",
    });

    // 2. Upload to file server
    const uploadRes = await axios.post(
      "https://fileupload.dev.ainqaplatform.in/primarycareng/11",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json",
        },
      }
    );

    const fileId = uploadRes.data.fileid;
    const uploadedUrl = `https://fileupload.dev.ainqaplatform.in/primarycareng/${fileId}`;
    console.log("✅ Uploaded file:", uploadedUrl);

    // 3. Call image-preprocess API
    const preprocessRes = await axios.post(
      "https://cpgproapi.dev.ainqaplatform.in/image-preprocess",
      {
        imageUrls: [uploadedUrl],
        log_level: options.env?.LOG_LEVEL ?? "",
        logOrderSeq: "3",
        logHeaderid: options.logHeaderId ?? "",
        ebmPatId: options.patientId ?? "",
        encounterID: "",
        patientID: "",
        status: "Summarized",
        model: "cloud-vision-ai",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const processedImg = preprocessRes.data;
    console.log("✅ Preprocessed:", processedImg);

    // 4. Call image-to-text API
    const textRes = await axios.post(
      "https://cpgproapi.dev.ainqaplatform.in/image-to-text",
      {
        img_url: processedImg?.img_url,
        logOrderSeq: processedImg?.logOrderSeqCount ?? "1",
        log_level: options.env?.LOG_LEVEL ?? "",
        logHeaderid: options.logHeaderId ?? "",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const textResp = textRes.data;
    console.log("✅ Extracted text:", textResp);

    return { textResp,processedImg };
  } catch (err) {
    console.error("❌ Error in processBase64Image:", err.message);
    throw err;
  }
}


module.exports = registerSocket;
