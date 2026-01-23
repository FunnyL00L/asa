/**
 * GAME BACKEND SERVERLESS (Google Apps Script)
 * -----------------------------------------------------------------
 * COMPATIBILITY UPDATE: Supports Client App v2 (Login, GetQuestions with Options Array, SubmitScore)
 */

// --- CONFIGURATION ---
const OWNER_YUDA = "YudaAR";
const OWNER_SARCO = "SarcoAR";
const SUPER_ADMIN = "Prama";

// GAME IDs
const GAME_ID_YUDA = "YUDA_AR";
const GAME_ID_SARCO = "SARCO_AR";

// TAB NAMES
const SHEET_ADMIN = "Sheet_Admin";

const SHEET_SISWA_YUDA = "Siswa_Yuda";
const SHEET_SOAL_YUDA = "Soal_Yuda";
const SHEET_SKOR_YUDA = "Skor_Yuda";

const SHEET_SISWA_SARCO = "Siswa_Sarco";
const SHEET_SOAL_SARCO = "Soal_Sarco";
const SHEET_SKOR_SARCO = "Skor_Sarco";

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSheetIfNotExists(ss, SHEET_ADMIN, ["Username", "Password"]);
  
  // Yuda Sheets
  createSheetIfNotExists(ss, SHEET_SISWA_YUDA, ["ID_Siswa", "Nama_Siswa", "Token_Login", "Kelas", "Owner"]);
  createSheetIfNotExists(ss, SHEET_SOAL_YUDA, ["ID_Soal", "Pertanyaan", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Jawaban_Benar", "Materi", "Game_ID", "Owner", "Poin"]);
  createSheetIfNotExists(ss, SHEET_SKOR_YUDA, ["ID_Log", "Token_Siswa", "ID_Soal", "Skor", "Game_Source", "Timestamp", "Owner"]);

  // Sarco Sheets
  createSheetIfNotExists(ss, SHEET_SISWA_SARCO, ["ID_Siswa", "Nama_Siswa", "Token_Login", "Kelas", "Owner"]);
  createSheetIfNotExists(ss, SHEET_SOAL_SARCO, ["ID_Soal", "Pertanyaan", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Jawaban_Benar", "Materi", "Game_ID", "Owner", "Poin"]);
  createSheetIfNotExists(ss, SHEET_SKOR_SARCO, ["ID_Log", "Token_Siswa", "ID_Soal", "Skor", "Game_Source", "Timestamp", "Owner"]);
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
}

// --- HELPER: MAPPING IDENTIFIER TO SHEETS ---
function getTargetSheets(identifier) {
  if (!identifier) return null;
  const id = String(identifier).trim().toUpperCase();

  if (id === "YUDAAR" || id === GAME_ID_YUDA) {
    return { siswa: SHEET_SISWA_YUDA, soal: SHEET_SOAL_YUDA, skor: SHEET_SKOR_YUDA, owner: OWNER_YUDA };
  } 
  else if (id === "SARCOAR" || id === GAME_ID_SARCO) {
    return { siswa: SHEET_SISWA_SARCO, soal: SHEET_SOAL_SARCO, skor: SHEET_SKOR_SARCO, owner: OWNER_SARCO };
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
      // Client app sends: token, score, game_id
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

  // COMPATIBILITY: Client App expects 'questions' array
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

// --- MAPPERS (With Extra Compatibility Fields) ---

function mapQuestionRow(row, forcedOwner) {
    // COMPATIBILITY: Add 'options' array for Client App mapping logic
    const optionsArray = [
       { label: 'A', text: row[2], isCorrect: row[6] === 'A' },
       { label: 'B', text: row[3], isCorrect: row[6] === 'B' },
       { label: 'C', text: row[4], isCorrect: row[6] === 'C' },
       { label: 'D', text: row[5], isCorrect: row[6] === 'D' }
    ];

    return {
      id: String(row[0]),
      question: row[1],
      // Standard Flat Options (For Admin)
      optionA: row[2],
      optionB: row[3],
      optionC: row[4],
      optionD: row[5],
      correctAnswer: row[6],
      material: row[7],
      gameId: row[8],
      owner: forcedOwner, 
      points: row[10] ? parseInt(row[10]) : 10,
      // Array Options (For Client App)
      options: optionsArray
    };
}

function mapStudentRow(row, forcedOwner) {
    return {
      id: String(row[0]),
      name: row[1],
      token: row[2],
      class: row[3],
      owner: forcedOwner
    };
}

function mapScoreRow(row, forcedOwner) {
    return {
      id: String(row[0]),
      token: row[1],
      idSoal: row[2],
      score: row[3],
      gameId: row[4],
      timestamp: row[5],
      owner: forcedOwner
    };
}

// --- CLIENT LOGIC ---

function unityLoginStudent(token) {
  const safeToken = String(token).trim().toUpperCase();
  
  let foundStudent = null;
  let gameId = null;
  let owner = null;

  // 1. Cek DB Yuda
  const dataYuda = getDataFromSheet(SHEET_SISWA_YUDA);
  for (let row of dataYuda) {
      if (String(row[2]).trim().toUpperCase() === safeToken) {
          foundStudent = mapStudentRow(row, OWNER_YUDA);
          gameId = GAME_ID_YUDA;
          owner = OWNER_YUDA;
          break;
      }
  }

  // 2. Cek DB Sarco
  if (!foundStudent) {
    const dataSarco = getDataFromSheet(SHEET_SISWA_SARCO);
    for (let row of dataSarco) {
        if (String(row[2]).trim().toUpperCase() === safeToken) {
            foundStudent = mapStudentRow(row, OWNER_SARCO);
            gameId = GAME_ID_SARCO;
            owner = OWNER_SARCO;
            break;
        }
    }
  }

  if (foundStudent) {
    return { 
      status: "success",
      name: foundStudent.name,
      studentName: foundStudent.name, 
      class: foundStudent.class,
      className: foundStudent.class, 
      owner: owner,
      token: foundStudent.token,
      game_info: { id: gameId, name: owner }
    };
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
  } finally {
    lock.releaseLock();
  }
}

// --- ADMIN OPERATIONS ---
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
    const rowData = [
      params.id || Date.now().toString(),
      params.question,
      params.optionA,
      params.optionB,
      params.optionC,
      params.optionD,
      params.correctAnswer,
      params.material,
      params.gameId,
      targets.owner,
      params.points
    ];
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
         sheet.deleteRow(i+1);
         return { status: "success" };
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
         sheet.deleteRow(i+1);
         return { status: "success" };
       }
    }
     return { status: "error", message: "ID Not Found" };
   } finally { lock.releaseLock(); }
}