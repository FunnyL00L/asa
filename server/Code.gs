/**
 * GAME BACKEND SERVERLESS (Google Apps Script) - FINAL SEPARATED DB
 * -----------------------------------------------------------------
 * Struktur Tab Spreadsheet (Sesuai Gambar User):
 * 1. Sheet_Admin
 * 2. Siswa_Yuda, Soal_Yuda, Skor_Yuda
 * 3. Siswa_Sarco, Soal_Sarco, Skor_Sarco
 * 
 * IMPORTANT: Create a NEW VERSION when deploying!
 */

// --- CONFIGURATION ---
const OWNER_YUDA = "YudaAR";
const OWNER_SARCO = "SarcoAR";
const SUPER_ADMIN = "Prama";

// TAB NAMES - HARUS SAMA PERSIS DENGAN DI SPREADSHEET
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

  // Create Yuda Sheets
  createSheetIfNotExists(ss, SHEET_SISWA_YUDA, ["ID_Siswa", "Nama_Siswa", "Token_Login", "Kelas", "Owner"]);
  createSheetIfNotExists(ss, SHEET_SOAL_YUDA, ["ID_Soal", "Pertanyaan", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Jawaban_Benar", "Materi", "Game_ID", "Owner", "Poin"]);
  createSheetIfNotExists(ss, SHEET_SKOR_YUDA, ["ID_Log", "Token_Siswa", "ID_Soal", "Skor", "Game_Source", "Timestamp", "Owner"]);

  // Create Sarco Sheets
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

// --- HELPER: MAPPING REQUESTER TO SHEETS ---

function getTargetSheets(identifier) {
  // identifier bisa berupa Username (YudaAR) atau GameID (YUDA_AR)
  if (!identifier) return null;
  const id = String(identifier).trim().toUpperCase();

  if (id === "YUDAAR" || id === "YUDA_AR") {
    return { 
      siswa: SHEET_SISWA_YUDA, 
      soal: SHEET_SOAL_YUDA, 
      skor: SHEET_SKOR_YUDA, 
      owner: OWNER_YUDA 
    };
  } 
  else if (id === "SARCOAR" || id === "SARCO_AR") {
    return { 
      siswa: SHEET_SISWA_SARCO, 
      soal: SHEET_SOAL_SARCO, 
      skor: SHEET_SKOR_SARCO, 
      owner: OWNER_SARCO 
    };
  }
  
  // Jika Prama (Super Admin) mencoba menulis tanpa memilih target spesifik, return null
  // agar error handling di function pemanggil menangkapnya.
  return null;
}

// --- HTTP HANDLERS (DoGet & DoPost) ---

function doGet(e) {
  const action = e.parameter.action;
  const requester = e.parameter.requester; // Param ini dikirim oleh Frontend
  let result = {};

  try {
    if (action === "getQuestions") {
      const gameId = e.parameter.game_id; 
      result = getQuestions(gameId, requester);
    } else if (action === "getStudents") {
       result = getStudents(requester);
    } else if (action === "getScores") {
       result = getScores(requester);
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

    // --- UNITY ACTIONS ---
    if (action === "login") {
      // Unity mengirim token. Kita cek ke semua DB (Yuda & Sarco).
      result = unityLoginStudent(params.token); 
    } else if (action === "submitScore") {
      // Unity mengirim token, score, game_id
      result = submitScore(params.token, params.score, params.game_id, params.id_soal);
    } 
    
    // --- WEB ADMIN ACTIONS ---
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
  data.shift(); // remove header
  return data;
}

// READ DATA
function getQuestions(gameId, requester) {
  let allQuestions = [];

  // Logic: Jika requester Yuda, ambil dari Soal_Yuda. Jika Prama (Super Admin), ambil semua.
  if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SOAL_YUDA);
    // Force set owner to YudaAR regardless of column value
    const q = data.map(row => mapQuestionRow(row, OWNER_YUDA));
    allQuestions = allQuestions.concat(q);
  } 
  
  if (requester === OWNER_SARCO || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SOAL_SARCO);
    // Force set owner to SarcoAR
    const q = data.map(row => mapQuestionRow(row, OWNER_SARCO));
    allQuestions = allQuestions.concat(q);
  }

  // Filter tambahan jika Unity meminta spesifik Game ID (opsional)
  if (gameId && gameId !== "ALL" && gameId !== "") {
    allQuestions = allQuestions.filter(q => q.gameId === gameId);
  }

  return { status: "success", data: allQuestions };
}

function getStudents(requester) {
  let allStudents = [];

  // Jika Yuda login, baca Siswa_Yuda
  if (requester === OWNER_YUDA || requester === SUPER_ADMIN) {
    const data = getDataFromSheet(SHEET_SISWA_YUDA);
    // Kita paksa field 'owner' jadi YudaAR supaya di frontend admin muncul benar
    const s = data.map(row => mapStudentRow(row, OWNER_YUDA));
    allStudents = allStudents.concat(s);
  }

  // Jika Sarco login, baca Siswa_Sarco
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

// --- MAPPERS (With Forced Owner Injection) ---

function mapQuestionRow(row, forcedOwner) {
    return {
      id: String(row[0]),
      question: row[1],
      optionA: row[2],
      optionB: row[3],
      optionC: row[4],
      optionD: row[5],
      correctAnswer: row[6],
      material: row[7],
      gameId: row[8],
      owner: forcedOwner, // Use the detected owner
      points: row[10] ? parseInt(row[10]) : 10
    };
}

function mapStudentRow(row, forcedOwner) {
    return {
      id: String(row[0]),
      name: row[1],
      token: row[2],
      class: row[3],
      owner: forcedOwner // Use the detected owner
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
      owner: forcedOwner // Use the detected owner
    };
}

// --- WRITE OPERATIONS ---

function unityLoginStudent(token) {
  const safeToken = String(token).trim().toUpperCase();
  
  // Cek Sheet Yuda
  let data = getDataFromSheet(SHEET_SISWA_YUDA);
  for (let row of data) {
      if (String(row[2]).trim().toUpperCase() === safeToken) {
          return { status: "success", data: mapStudentRow(row, OWNER_YUDA) };
      }
  }

  // Cek Sheet Sarco
  data = getDataFromSheet(SHEET_SISWA_SARCO);
  for (let row of data) {
      if (String(row[2]).trim().toUpperCase() === safeToken) {
          return { status: "success", data: mapStudentRow(row, OWNER_SARCO) };
      }
  }

  return { status: "error", message: "Invalid Token" };
}

function addStudent(name, className, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner: " + owner + ". Must be YudaAR or SarcoAR." };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.siswa);
    const id = Date.now().toString();
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Insert into specific sheet
    sheet.appendRow([id, name, token, className, targets.owner]);
    
    return { status: "success", data: { id, name, token, class: className, owner: targets.owner } };
  } finally {
    lock.releaseLock();
  }
}

function updateStudent(id, name, className, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Invalid Owner context" };

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
    return { status: "error", message: "Student ID not found in " + targets.siswa };
  } finally {
    lock.releaseLock();
  }
}

function deleteStudent(id, owner) {
  const targets = getTargetSheets(owner);
  if (!targets) return { status: "error", message: "Missing Owner Info" };

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
    return { status: "error", message: "Student ID not found" };
  } finally {
    lock.releaseLock();
  }
}

function saveQuestion(params) {
  // Use GameID (YUDA_AR or SARCO_AR) to determine target sheet
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
        foundIndex = i + 1; 
        break;
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
  } finally {
    lock.releaseLock();
  }
}

function deleteQuestion(id, context) {
  // context bisa berupa gameId (misal YUDA_AR) atau owner (YudaAR)
  const targets = getTargetSheets(context);
  if (!targets) return { status: "error", message: "Invalid Context for deletion" };

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
     return { status: "error", message: "ID Not Found in " + targets.soal };
   } finally {
     lock.releaseLock();
   }
}

function submitScore(token, score, gameId, idSoal) {
  const targets = getTargetSheets(gameId);
  if (!targets) return { status: "error", message: "Invalid Game ID for Score" };

  // Validate Token existence first
  const loginCheck = unityLoginStudent(token);
  if (loginCheck.status === "error") return loginCheck;
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targets.skor);
    const idLog = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    
    sheet.appendRow([idLog, token, idSoal || "", score, gameId, timestamp, targets.owner]);
    return { status: "success", message: "Score saved to " + targets.skor };
  } catch (e) {
    return { status: "error", message: "Server busy." };
  } finally {
    lock.releaseLock();
  }
}

function deleteScore(idLog, owner) {
   const targets = getTargetSheets(owner);
   if (!targets) return { status: "error", message: "Invalid Score Context" };

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
     return { status: "error", message: "Score Log ID Not Found" };
   } finally {
     lock.releaseLock();
   }
}