/**
 * GAME BACKEND SERVERLESS (Google Apps Script)
 * -----------------------------------------------------------------
 * COMPATIBILITY UPDATE: Supports Client App v2, Content Management & Game Config
 * FEATURE UPDATE: Uploads files to Google Drive
 */

// --- CONFIGURATION ---
const OWNER_YUDA = "YudaAR";
const OWNER_SARCO = "SarcoAR";
const SUPER_ADMIN = "Prama";

// GAME IDs
const GAME_ID_YUDA = "YUDA_AR";
const GAME_ID_SARCO = "SARCO_AR";

// FOLDER NAME FOR UPLOADS
const UPLOAD_FOLDER_NAME = "AR_Game_Content_Uploads";

// TAB NAMES
const SHEET_ADMIN = "Sheet_Admin";

const SHEET_SISWA_YUDA = "Siswa_Yuda";
const SHEET_SOAL_YUDA = "Soal_Yuda";
const SHEET_SKOR_YUDA = "Skor_Yuda";
const SHEET_KONTEN_YUDA = "Konten_Yuda";
const SHEET_CONFIG_YUDA = "Config_Yuda"; 

const SHEET_SISWA_SARCO = "Siswa_Sarco";
const SHEET_SOAL_SARCO = "Soal_Sarco";
const SHEET_SKOR_SARCO = "Skor_Sarco";
const SHEET_KONTEN_SARCO = "Konten_Sarco";
const SHEET_CONFIG_SARCO = "Config_Sarco"; 

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSheetIfNotExists(ss, SHEET_ADMIN, ["Username", "Password"]);
  
  // Yuda Sheets
  createSheetIfNotExists(ss, SHEET_SISWA_YUDA, ["ID_Siswa", "Nama_Siswa", "Token_Login", "Kelas", "Owner"]);
  createSheetIfNotExists(ss, SHEET_SOAL_YUDA, ["ID_Soal", "Pertanyaan", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Jawaban_Benar", "Materi", "Game_ID", "Owner", "Poin"]);
  createSheetIfNotExists(ss, SHEET_SKOR_YUDA, ["ID_Log", "Token_Siswa", "ID_Soal", "Skor", "Game_Source", "Timestamp", "Owner"]);
  // UPDATED HEADER FOR CONTENT: File_URL, File_Name, File_Type
  createSheetIfNotExists(ss, SHEET_KONTEN_YUDA, ["ID_Konten", "Judul", "Lokasi", "Isi_Konten", "File_URL", "Tanggal", "Owner", "File_Name", "File_Type"]);
  createSheetIfNotExists(ss, SHEET_CONFIG_YUDA, ["Key", "Value", "Last_Updated"]); 

  // Sarco Sheets
  createSheetIfNotExists(ss, SHEET_SISWA_SARCO, ["ID_Siswa", "Nama_Siswa", "Token_Login", "Kelas", "Owner"]);
  createSheetIfNotExists(ss, SHEET_SOAL_SARCO, ["ID_Soal", "Pertanyaan", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Jawaban_Benar", "Materi", "Game_ID", "Owner", "Poin"]);
  createSheetIfNotExists(ss, SHEET_SKOR_SARCO, ["ID_Log", "Token_Siswa", "ID_Soal", "Skor", "Game_Source", "Timestamp", "Owner"]);
  // UPDATED HEADER FOR CONTENT
  createSheetIfNotExists(ss, SHEET_KONTEN_SARCO, ["ID_Konten", "Judul", "Lokasi", "Isi_Konten", "File_URL", "Tanggal", "Owner", "File_Name", "File_Type"]);
  createSheetIfNotExists(ss, SHEET_CONFIG_SARCO, ["Key", "Value", "Last_Updated"]); 
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else {
    // Ideally we would check headers here, but for simplicity we rely on manual updates if schema changes drastically
  }
}

// --- DRIVE HELPER ---
function getOrCreateUploadFolder() {
  const folders = DriveApp.getFoldersByName(UPLOAD_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(UPLOAD_FOLDER_NAME);
  }
}

function saveFileToDrive(base64Data, fileName, mimeType) {
  try {
    const folder = getOrCreateUploadFolder();
    
    // Extract base64 part if it has the prefix
    const dataStart = base64Data.indexOf(',') + 1;
    const cleanBase64 = dataStart > 0 ? base64Data.substring(dataStart) : base64Data;
    
    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    const file = folder.createFile(blob);
    // Make public so AR app can download
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getDownloadUrl();
  } catch (e) {
    throw new Error("Drive Upload Failed: " + e.toString());
  }
}


// --- HELPER: MAPPING IDENTIFIER TO SHEETS ---
function getTargetSheets(identifier) {
  if (!identifier) return null;
  const id = String(identifier).trim().toUpperCase();

  if (id === "YUDAAR" || id === GAME_ID_YUDA) {
    return { 
      siswa: SHEET_SISWA_YUDA, 
      soal: SHEET_SOAL_YUDA, 
      skor: SHEET_SKOR_YUDA, 
      konten: SHEET_KONTEN_YUDA,
      config: SHEET_CONFIG_YUDA,
      owner: OWNER_YUDA 
    };
  } 
  else if (id === "SARCOAR" || id === GAME_ID_SARCO) {
    return { 
      siswa: SHEET_SISWA_SARCO, 
      soal: SHEET_SOAL_SARCO, 
      skor: SHEET_SKOR_SARCO, 
      konten: SHEET_KONTEN_SARCO,
      config: SHEET_CONFIG_SARCO,
      owner: OWNER_SARCO 
    };
  }
  return null;
}

// --- HTTP HANDLERS ---

function doGet(e) {
  const action = e.parameter.action;
  const requester = e.parameter.requester; 
  const gameId = e.parameter.game_id;

  let result = {};
  try {
    if (action === "getQuestions") {
      result = getQuestions(gameId, requester);
    } else if (action === "getStudents") {
       result = getStudents(requester);
    } else if (action === "getScores") {
       result = getScores(requester);
    } else if (action === "getContents") {
       result = getContents(gameId, requester);
    } else if (action === "getDescription") {
       result = getDescription(requester); 
    } else if (action === "login") {
       result = unityLoginStudent(e.parameter.token);
    } else {
      result = { status: "error", message: "Invalid Action" };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result = {};
  try {
    let params = e.parameter;
    if (e.postData && e.postData.contents) {
      try {
        const jsonParams = JSON.parse(e.postData.contents);
        for (let key in jsonParams) {
          params[key] = jsonParams[key];
        }
      } catch(e) {}
    }

    const action = params.action;

    // CLIENT APP ACTIONS
    if (action === "login") {
      result = unityLoginStudent(params.token); 
    } else if (action === "submitScore") {
      result = submitScore(params.token, params.score, params.game_id, params.id_soal);
    } 
    // ADMIN ACTIONS
    else if (action === "adminAddStudent") {
      result = addStudent(params.name, params.class_name, params.owner);
    } else if (action === "adminUpdateStudent") {
      result = updateStudent(params.id, params.name, params.class_name, params.owner);
    } else if (action === "adminDeleteStudent") {
      result = deleteStudent(params.id, params.owner);
    } else if (action === "adminSaveQuestion") {
      result = saveQuestion(params);
    } else if (action === "adminDeleteQuestion") {
       result = deleteQuestion(params.id, params.gameId || params.owner);
    } else if (action === "adminDeleteScore") {
       result = deleteScore(params.id, params.owner);
    } else if (action === "adminSaveContent") {
       result = saveContent(params);
    } else if (action === "adminDeleteContent") {
       result = deleteContent(params.id, params.owner);
    } else if (action === "adminSaveDescription") {
       result = saveDescription(params.owner, params.description);
    } else {
      result = { status: "error", message: "Invalid Action POST" };
    }

  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// --- CORE LOGIC ---

function getDataFromSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  return data;
}

// ... [Existing Get Functions] ...

function getContents(gameId, requester) {
  let allContents = [];
  let sources = [];
  if (gameId === GAME_ID_YUDA) {
    sources.push({ sheet: SHEET_KONTEN_YUDA, owner: OWNER_YUDA });
  } else if (gameId === GAME_ID_SARCO) {
    sources.push({ sheet: SHEET_KONTEN_SARCO, owner: OWNER_SARCO });
  } else {
    if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
      sources.push({ sheet: SHEET_KONTEN_YUDA, owner: OWNER_YUDA });
    }
    if (requester === OWNER_SARCO || requester === SUPER_ADMIN) {
      sources.push({ sheet: SHEET_KONTEN_SARCO, owner: OWNER_SARCO });
    }
  }
  for (let src of sources) {
    const data = getDataFromSheet(src.sheet);
    // Row Indices: 
    // 0:ID, 1:Judul, 2:Lokasi, 3:Isi, 4:File_URL, 5:Tanggal, 6:Owner, 7:File_Name, 8:File_Type
    const mapped = data.map(row => ({
      id: String(row[0]), 
      title: row[1], 
      location: row[2] || "", 
      body: row[3], 
      fileUrl: row[4] || "", // This is now a Drive URL
      date: row[5], 
      owner: row[6],
      fileName: row[7] || "",
      fileType: row[8] || ""
    }));
    allContents = allContents.concat(mapped);
  }
  return { status: "success", data: allContents };
}

function getQuestions(gameId, requester) {
  let allQuestions = [];
  let sources = [];
  if (gameId === GAME_ID_YUDA) {
    sources.push({ sheet: SHEET_SOAL_YUDA, owner: OWNER_YUDA });
  } else if (gameId === GAME_ID_SARCO) {
    sources.push({ sheet: SHEET_SOAL_SARCO, owner: OWNER_SARCO });
  } else {
    if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
      sources.push({ sheet: SHEET_SOAL_YUDA, owner: OWNER_YUDA });
    }
    if (requester === OWNER_SARCO || requester === SUPER_ADMIN) {
      sources.push({ sheet: SHEET_SOAL_SARCO, owner: OWNER_SARCO });
    }
  }
  for (let src of sources) {
    const data = getDataFromSheet(src.sheet);
    const q = data.map(row => mapQuestionRow(row, src.owner));
    allQuestions = allQuestions.concat(q);
  }
  return { status: "success", data: allQuestions, questions: allQuestions };
}

function getStudents(requester) {
  let allStudents = [];
  if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SISWA_YUDA);
    const s = data.map(row => mapStudentRow(row, OWNER_YUDA));
    allStudents = allStudents.concat(s);
  }
  if (requester === OWNER_SARCO || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SISWA_SARCO);
    const s = data.map(row => mapStudentRow(row, OWNER_SARCO));
    allStudents = allStudents.concat(s);
  }
  return { status: "success", data: allStudents };
}

function getScores(requester) {
  let allScores = [];
  if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SKOR_YUDA);
    const s = data.map(row => mapScoreRow(row, OWNER_YUDA));
    allScores = allScores.concat(s);
  }
  if (requester === OWNER_SARCO || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SKOR_SARCO);
    const s = data.map(row => mapScoreRow(row, OWNER_SARCO));
    allScores = allScores.concat(s);
  }
  return { status: "success", data: allScores };
}

// ... [Existing Mappers] ...
function mapQuestionRow(row, forcedOwner) {
    const optionsArray = [
       { label: 'A', text: row[2], isCorrect: row[6] === 'A' },
       { label: 'B', text: row[3], isCorrect: row[6] === 'B' },
       { label: 'C', text: row[4], isCorrect: row[6] === 'C' },
       { label: 'D', text: row[5], isCorrect: row[6] === 'D' }
    ];
    return {
      id: String(row[0]), question: row[1], optionA: row[2], optionB: row[3], optionC: row[4], optionD: row[5],
      correctAnswer: row[6], material: row[7], gameId: row[8], owner: forcedOwner, points: row[10] ? parseInt(row[10]) : 10, options: optionsArray
    };
}
function mapStudentRow(row, forcedOwner) {
    return { id: String(row[0]), name: row[1], token: row[2], class: row[3], owner: forcedOwner };
}
function mapScoreRow(row, forcedOwner) {
    return { id: String(row[0]), token: row[1], idSoal: row[2], score: row[3], gameId: row[4], timestamp: row[5], owner: forcedOwner };
}

// ... [Client Logic] ...
function unityLoginStudent(token) {
  const safeToken = String(token).trim().toUpperCase();
  let foundStudent = null; let gameId = null; let owner = null;

  const dataYuda = getDataFromSheet(SHEET_SISWA_YUDA);
  for (let row of dataYuda) {
      if (String(row[2]).trim().toUpperCase() === safeToken) {
          foundStudent = mapStudentRow(row, OWNER_YUDA); gameId = GAME_ID_YUDA; owner = OWNER_YUDA; break;
      }
  }
  if (!foundStudent) {
    const dataSarco = getDataFromSheet(SHEET_SISWA_SARCO);
    for (let row of dataSarco) {
        if (String(row[2]).trim().toUpperCase() === safeToken) {
            foundStudent = mapStudentRow(row, OWNER_SARCO); gameId = GAME_ID_SARCO; owner = OWNER_SARCO; break;
        }
    }
  }
  if (foundStudent) {
    return { status: "success", name: foundStudent.name, studentName: foundStudent.name, class: foundStudent.class, className: foundStudent.class, owner: owner, token: foundStudent.token, game_info: { id: gameId, name: owner } };
  }
  return { status: "error", message: "Token Invalid / Not Found" };
}

function submitScore(token, score, gameId, idSoal) {
  const targets = getTargetSheets(gameId);
  if (!targets) return { status: "error", message: "Invalid Game ID (" + gameId + ")" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.skor);
    const idLog = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    sheet.appendRow([idLog, token, idSoal || "", score, gameId, timestamp, targets.owner]);
    return { status: "success", message: "Score saved" };
  } catch (e) {
    return { status: "error", message: "Server error: " + e.toString() };
  } finally { lock.releaseLock(); }
}

// ... [Admin Operations] ...
function addStudent(name, className, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.siswa);
    const id = Date.now().toString();
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    sheet.appendRow([id, name, token, className, targets.owner]);
    return { status: "success", data: { id, name, token, class: className, owner: targets.owner } };
  } finally { lock.releaseLock(); }
}

function updateStudent(id, name, className, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.siswa);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.getRange(i + 1, 2).setValue(name);
        sheet.getRange(i + 1, 4).setValue(className);
        return { status: "success" };
      }
    }
    return { status: "error", message: "ID not found" };
  } finally { lock.releaseLock(); }
}

function deleteStudent(id, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.siswa);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { status: "success" };
      }
    }
    return { status: "error", message: "ID not found" };
  } finally { lock.releaseLock(); }
}

function saveQuestion(params) {
  const targets = getTargetSheets(params.gameId); 
  if (!targets) return { status: "error", message: "Invalid Game ID" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.soal);
    const data = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(params.id)) {
        foundIndex = i + 1; break;
      }
    }
    const rowData = [params.id || Date.now().toString(), params.question, params.optionA, params.optionB, params.optionC, params.optionD, params.correctAnswer, params.material, params.gameId, targets.owner, params.points];
    if (foundIndex > -1) {
      sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: "success" };
  } catch (e) {
    return { status: "error", message: e.toString() };
  } finally { lock.releaseLock(); }
}

function deleteQuestion(id, context) {
  const targets = getTargetSheets(context);
  if (!targets) return { status: "error", message: "Invalid Context" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.soal);
    const data = sheet.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
       if(String(data[i][0]) === String(id)) {
         sheet.deleteRow(i+1); return { status: "success" };
       }
    }
    return { status: "error", message: "ID Not Found" };
  } finally { lock.releaseLock(); }
}

function deleteScore(idLog, owner) {
   const targets = getTargetSheets(owner);
   if (!targets) return { status: "error", message: "Invalid Context" };
   const lock = LockService.getScriptLock();
   try {
     lock.waitLock(10000);
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.skor);
     const data = sheet.getDataRange().getValues();
     for(let i=1; i<data.length; i++) {
       if(String(data[i][0]) === String(idLog)) {
         sheet.deleteRow(i+1); return { status: "success" };
       }
    }
    return { status: "error", message: "ID Not Found" };
  } finally { lock.releaseLock(); }
}

// --- UPDATED CONTENT MANAGEMENT (FILE UPLOAD TO DRIVE) ---
function saveContent(params) {
  const targets = getTargetSheets(params.owner);
  if (!targets) return { status: "error", message: "Invalid Owner" };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // Increased wait time for Drive operations
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.konten);
    const data = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(params.id)) { foundIndex = i + 1; break; }
    }
    
    // FILE UPLOAD LOGIC
    let fileUrl = params.fileUrl || ""; // Keep existing if not updating
    let fileName = params.fileName || "";
    let fileType = params.fileType || "";

    // If new file data is provided in base64
    if (params.fileData && params.fileName) {
       fileUrl = saveFileToDrive(params.fileData, params.fileName, params.fileType);
       fileName = params.fileName;
       fileType = params.fileType;
    }

    // Row Structure: 
    // 0:ID, 1:Judul, 2:Lokasi, 3:Isi, 4:File_URL, 5:Tanggal, 6:Owner, 7:File_Name, 8:File_Type
    const rowData = [
      params.id || Date.now().toString(), 
      params.title, 
      params.location || "", 
      params.body, 
      fileUrl, 
      params.date || new Date().toISOString(), 
      targets.owner,
      fileName,
      fileType
    ];

    if (foundIndex > -1) {
      // If updating, we overwrite the row. 
      // Note: If user didn't upload a new file, params.fileData is undefined, 
      // but we should pass the existing URL back from frontend or handle it here.
      // Ideally frontend sends back the existing URL if no new file.
      sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    return { status: "success", data: rowData };
  } catch (e) { 
    return { status: "error", message: "Save Error: " + e.toString() }; 
  } finally { 
    lock.releaseLock(); 
  }
}

function deleteContent(id, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner" };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.konten);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) { 
        sheet.deleteRow(i + 1); 
        // Optional: Could delete file from Drive too if we stored File ID, 
        // but for now we keep it simple (File remains in Drive trash/folder)
        return { status: "success" }; 
      }
    }
    return { status: "error", message: "ID Not Found" };
  } finally { lock.releaseLock(); }
}

// --- CONFIG ---
const KEY_DESCRIPTION = "GAME_DESCRIPTION";

function getDescription(requester) {
  let descriptionYuda = "";
  let descriptionSarco = "";
  if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
     descriptionYuda = getConfigValue(SHEET_CONFIG_YUDA, KEY_DESCRIPTION);
  }
  if (requester === OWNER_SARCO || requester === SUPER_ADMIN) {
     descriptionSarco = getConfigValue(SHEET_CONFIG_SARCO, KEY_DESCRIPTION);
  }
  return { status: "success", data: { yuda: descriptionYuda, sarco: descriptionSarco } };
}

function saveDescription(owner, text) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner for Config" };
  return setConfigValue(targets.config, KEY_DESCRIPTION, text);
}

function getConfigValue(sheetName, key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "";
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === key) return data[i][1];
  }
  return "";
}

function setConfigValue(sheetName, key, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet missing" };
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const data = sheet.getDataRange().getValues();
    let foundIndex = -1;
    for(let i=1; i<data.length; i++) {
      if(data[i][0] === key) {
        foundIndex = i+1; break;
      }
    }
    if (foundIndex > -1) {
      sheet.getRange(foundIndex, 2).setValue(value);
      sheet.getRange(foundIndex, 3).setValue(new Date().toISOString());
    } else {
      sheet.appendRow([key, value, new Date().toISOString()]);
    }
    return { status: "success", message: "Config saved" };
  } finally { lock.releaseLock(); }
}
