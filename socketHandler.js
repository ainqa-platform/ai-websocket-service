// socketHandler.js
const FormData = require("form-data");
const axios = require("axios");
const {
  createLogHeader,
  createLogStep,
  createLogData,
} = require("./loggingUtils");

global.userSessions = {}; // { userId: [socketId1, socketId2] }

function startTimer() {
  const start = process.hrtime();
  return () => {
    const [sec, nano] = process.hrtime(start);
    return (sec + nano / 1e9).toFixed(2); // seconds with 2 decimal places
  };
}


function registerSocket(io) {
  createSocket(io);
}

async function createSocket(io) {
  let logHeaderId = null;
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Timeout handler (10 min = 600000 ms)
    const disconnectTimer = setTimeout(() => {
      console.log(`Auto-disconnecting socket ${socket.id} after 10 mins`);
      socket.disconnect(true); // force disconnect
    }, 10 * 60 * 1000);

    // Step 1: Register after login
    socket.on("register", async (userId) => {
      logHeaderId = await createLogHeader({ personid: userId });
      const endStep1 = startTimer();
      const step1Time = endStep1();

      // Log Step 1
      if (logHeaderId) {
        const step1LogId = await createLogStep(logHeaderId, {
          orderSequence: "1",
          stepName: "NodeJS-Before register to socket",
          startTime: Date.now() - step1Time * 1000,
          endTime: Date.now(),
          responseTime: step1Time,
        });

        if (step1LogId) {
          await createLogData(logHeaderId, step1LogId, {
            inputData: { logid: logHeaderId },
            outputData: {},
            dataDescription: { desc: "NodeJS-Before register to socket" },
          });
        }
      }

      const endStep2 = startTimer();

      if (!global.userSessions[userId]) {
        global.userSessions[userId] = [];
      }
      global.userSessions[userId].push(socket.id);
      socket.userId = userId;

      const step2Time = endStep2();

      // Log Step 2
      if (logHeaderId) {
        const step2LogId = await createLogStep(logHeaderId, {
          orderSequence: "2",
          stepName:
            "NodeJS- After register to socket(socketId:" + socket.id + ")",
          startTime: Date.now() - step2Time * 1000,
          endTime: Date.now(),
          responseTime: step2Time,
        });

        if (step2LogId) {
          await createLogData(logHeaderId, step2LogId, {
            inputData: { socketid: socket.id },
            outputData: {},
            dataDescription: {
              desc:
                "NodeJS- After register to socket(socketId:" + socket.id + ")",
            },
          });
        }
      }

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
      const endStep3 = startTimer();
      const step3Time = endStep3();
      // Log Step 3
      if (logHeaderId) {
        const step3LogId = await createLogStep(logHeaderId, {
          orderSequence: "3",
          stepName:
            "NodeJS- Screen Shot received for socket(socketId:" +
            socket.id +
            ")",
          startTime: Date.now() - step3Time * 1000,
          endTime: Date.now(),
          responseTime: step3Time,
        });

        if (step3LogId) {
          await createLogData(logHeaderId, step3LogId, {
            inputData: { socketid: socket.id },
            outputData: {},
            dataDescription: {
              desc:
                "NodeJS- After register to socket(socketId:" + socket.id + ")",
            },
          });
        }
      }

      const endStep4 = startTimer();
      const imageDetails = data.imageBase64;
      const step4Time = endStep4();

      if (logHeaderId) {
        const step4LogId = await createLogStep(logHeaderId, {
          orderSequence: "4",
          stepName: "NodeJS- Screenshot taken" + socket.id + ")",
          startTime: Date.now() - step4Time * 1000,
          endTime: Date.now(),
          responseTime: step4Time,
        });

        if (step4LogId) {
          await createLogData(logHeaderId, step4LogId, {
            inputData: { socketid: socket.id, imagedata: data.imageBase64 },
            outputData: {},
            dataDescription: {
              desc:
                "NodeJS- Screenshot taken request(socketId:" + socket.id + ")",
            },
          });
        }
      }

      let obj = new Object();
      let imgDetArr = [];
      for (let i = 0; i < imageDetails.length; i++) {
        obj = new Object();
        obj.img = imageDetails[i];

        const endStep5 = startTimer();
        const step5Time = endStep5();

        if (logHeaderId) {
          const step5LogId = await createLogStep(logHeaderId, {
            orderSequence: "3",
            stepName:
              "NodeJS-Before Image OCR Extraction started" + socket.id + ")",
            startTime: Date.now() - step5Time * 1000,
            endTime: Date.now(),
            responseTime: step5Time,
          });

          if (step5LogId) {
            await createLogData(logHeaderId, step5LogId, {
              inputData: { socketid: socket.id },
              outputData: {},
              dataDescription: {
                desc:
                  "NodeJS-Before Image OCR Extraction started " +
                  socket.id +
                  ")",
              },
            });
          }
        }

        const endStep6 = startTimer();
        const imageExtractedText = await processBase64Image(imageDetails[i], {
          env: { LOG_LEVEL: "DEBUG" },
          logHeaderId: "12345",
          patientId: "P001",
        });
        const step6Time = endStep6();
        obj.extractText = imageExtractedText?.textResp?.responses[0] ?? "";
        obj.textresp = imageExtractedText?.textResp;
        obj.processedImg = imageExtractedText?.processedImg;

        imgDetArr.push(obj);

        if (logHeaderId) {
          const step6LogId = await createLogStep(logHeaderId, {
            orderSequence: "6",
            stepName:
              "NodeJS-After Image OCR Extraction ended" + socket.id + ")",
            startTime: Date.now() - step6Time * 1000,
            endTime: Date.now(),
            responseTime: step6Time,
          });

          if (step6LogId) {
            await createLogData(logHeaderId, step6LogId, {
              inputData: { socketid: socket.id },
              outputData: {},
              dataDescription: {
                desc:
                  "NodeJS-After Image OCR Extraction ended " + socket.id + ")",
              },
            });
          }
        }
      }
      console.log("screenshotTaken function inside");
      if (global.userSessions[data.userId]) {
        global.userSessions[data.userId].forEach(async (sockId) => {
          if (sockId !== socket.id) {
            const endStep7 = startTimer();
            io.to(sockId).emit("screenshotReceived", imgDetArr);
            const step7Time = endStep7();

            // Log Step 3
            if (logHeaderId) {
              const step7LogId = await createLogStep(logHeaderId, {
                orderSequence: "7",
                stepName:
                  "NodeJS- Emit screenshotReceived(socketId:" + socket.id + ")",
                startTime: Date.now() - step7Time * 1000,
                endTime: Date.now(),
                responseTime: step7Time,
              });

              if (step7LogId) {
                await createLogData(logHeaderId, step7LogId, {
                  inputData: { socketid: socket.id, imgDetArr: imgDetArr },
                  outputData: {},
                  dataDescription: {
                    desc:
                      "NodeJS- Emit screenshotReceived(socketId:" +
                      socket.id +
                      ")",
                  },
                });
              }
            }

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

    return { textResp, processedImg };
  } catch (err) {
    console.error("❌ Error in processBase64Image:", err.message);
    throw err;
  }
}

module.exports = registerSocket;
