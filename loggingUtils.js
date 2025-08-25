// utils/loggingUtils.js
const axios = require("axios");
require("dotenv").config();

let LOG_SERVICE_BASE_URL = null;
const USE_CASE_ID = "usecasedefination/10005";
const TENANT_ID = "1234";
const USE_CASE_TITLE = "Discharge Summary";
const readQdmQuery = process.env.ADAPTER_URL;
const clientdbName = process.env.CLIENT_DB_NAME;

const getParamsFromDb = async (code) => {
  const payload = {
    db_name: clientdbName,
    filter: {
      paracode: code,
    },
    queryid: "5cd5f97f-53d3-4ef0-94eb-e8391f00f589",
  };

  try {
    const response = await axios.post(
      readQdmQuery + "read_qdmqueries",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data?.[0]?.paraobj?.[0];
  } catch (error) {
    console.error("Error fetching params:", error.message);
    return null;
  }
};

async function getLogServiceBaseUrl() {
  if (!LOG_SERVICE_BASE_URL) {
    const params = await getParamsFromDb("PATIENTSUMMARY");
    LOG_SERVICE_BASE_URL = params?.REACT_APP_LOG_URL;
  }
  return LOG_SERVICE_BASE_URL;
}

async function createLogHeader(userInfo = {}, usecaseId = USE_CASE_ID) {
  try {
    const logserviceUrl = await getLogServiceBaseUrl();
    const payload = {
      usecaseid: usecaseId,
      user: {
        personid: userInfo.personid || "",
        practid: userInfo.practid || "",
        useremail: userInfo.useremail || "",
        patientid: userInfo.patientid || "",
      },
      tenant: TENANT_ID,
      sessionid: userInfo.sessionid || "",
      groupid: userInfo.groupid || "",
      usecasetitle: USE_CASE_TITLE,
      _id: "",
    };

    const response = await axios.post(`${logserviceUrl}/logheader`, payload);
    return response.data.response.Result[0].properties.doc._id;
  } catch (error) {
    console.error("Error creating log header:", error);
    return null;
  }
}

async function createLogStep(logHeaderId, stepInfo) {
  try {
    // Convert timestamps to Unix time (seconds) if they're in milliseconds
    const logserviceUrl = await getLogServiceBaseUrl();
    const executionStart =
      typeof stepInfo.startTime === "number"
        ? Math.floor(stepInfo.startTime / 1000)
        : stepInfo.startTime;

    const executionEnd =
      typeof stepInfo.endTime === "number"
        ? Math.floor(stepInfo.endTime / 1000)
        : stepInfo.endTime;

    const payload = {
      logheaderid: logHeaderId,
      ordersequence: String(stepInfo.orderSequence),
      ordername: String(stepInfo.stepName),
      executionstart: Number(executionStart),
      executionend: Number(executionEnd),
      responsetime: Number(stepInfo.responseTime), // Explicitly convert to number
      error: stepInfo.error || {},
    };

    const response = await axios.post(`${logserviceUrl}/logsteps`, payload);

    if (response.data.statuscode !== 200) {
      throw new Error(response.data.message || "Failed to create log step");
    }

    return response.data.response.Result[0].properties.doc._id;
  } catch (error) {
    console.error("Error creating log step:", error.message);
    if (error.response) {
      console.error("API response:", error.response.data);
    }
    return null;
  }
}

async function createLogData(logHeaderId, logStepId, dataInfo) {
  try {
    const logserviceUrl = await getLogServiceBaseUrl();
    const payload = {
      datadescription: dataInfo.dataDescription || {},
      errorstatus: dataInfo.errorStatus || false,
      indatatype: dataInfo.inDataType || "Object",
      inputdata: dataInfo.inputData || {},
      logheaderid: logHeaderId,
      logstepid: logStepId,
      outdatatype: dataInfo.outDataType || "Object",
      outputdata: dataInfo.outputData || {},
    };

    const response = await axios.post(`${logserviceUrl}/logdata`, payload);
    return response.data;
  } catch (error) {
    console.error("Error creating log data:", error);
    return null;
  }
}

module.exports = {
  createLogHeader,
  createLogStep,
  createLogData,
};
