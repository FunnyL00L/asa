/**
 * GAME BACKEND SERVERLESS (Google Apps Script)
 * --------------------------------------------
 * Copy this content into your Google Apps Script project (Extensions > Apps Script).
 * Deploy as Web App -> Execute as: Me -> Access: Anyone.
 * IMPORTANT: After updating this code, Create a NEW VERSION when deploying!
 */

const SHEET_ADMIN = "Sheet_Admin";
const SHEET_SOAL = "Sheet_Soal";
const SHEET_SISWA = "Sheet_Siswa";
const SHEET_SKOR = "Sheet_Skor";

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSheetIfNotExists(ss, SHEET_ADMIN, ["Username", "Password"]);
  createSheetIfNotExists(ss, SHEET_SOAL, ["ID_Soal", "Pertanyaan", "Opsi_A", "Opsi_B", "Opsi_C", "Opsi_D", "Jawaban_Benar", "Materi", "Game_ID", "Owner", "Poin"]);
  createSheetIfNotExists(ss, SHEET_SISWA, ["ID_Siswa", "Nama_Siswa", "Token_Login", "Kelas", "Owner"]);
  createSheetIfNotExists(ss, SHEET_SKOR, ["ID_Log", "Token_Siswa", "ID_Soal", "Skor", "Game_Source", "Timestamp", "Owner"]);
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
}

// --- HTTP HANDLERS ---

function doGet(e) {
  const action = e.parameter.action;
  let result = {};

  try {
    if (action === "getQuestions") {
      const gameId = e.parameter.game_id;
      const material = e.parameter.materi; 
      result = getQuestions(gameId, material);
    } else if (action === "getStudents") {
       result = getStudents();
    } else if (action === "getScores") {
       result = getScores();
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

    if (action === "login") {
      result = loginStudent(params.token);
    } else if (action === "submitScore") {
      result = submitScore(params.token, params.score, params.game_id, params.id_soal);
    } else if (action === "adminAddStudent") {
      result = addStudent(params.name, params.class_name, params.owner);
    } else if (action === "adminUpdateStudent") {
      // NEW: Edit Student
      result = updateStudent(params.id, params.name, params.class_name, params.owner);
    } else if (action === "adminDeleteStudent") {
      // NEW: Delete Student
      result = deleteStudent(params.id);
    } else if (action === "adminSaveQuestion") {
      result = saveQuestion(params);
    } else if (action === "adminDeleteQuestion") {
       result = deleteQuestion(params.id);
    } else {
      result = { status: "error", message: "Invalid Action POST" };
    }

  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// --- LOGIC FUNCTIONS ---

function getQuestions(gameId, material) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOAL);
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header
  
  const questions = data.map(row => {
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
      owner: row[9],
      points: row[10] ? parseInt(row[10]) : 10
    };
  });

  let filtered = questions;
  if (gameId && gameId !== 'ALL') {
    filtered = filtered.filter(q => q.gameId == gameId);
  }
  if (material) {
    filtered = filtered.filter(q => q.material == material);
  }

  return { status: "success", data: filtered };
}

function loginStudent(token) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SISWA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(token)) {
      return { 
        status: "success", 
        data: {
          id: data[i][0],
          name: data[i][1],
          token: data[i][2],
          class: data[i][3],
          owner: data[i][4]
        }
      };
    }
  }
  return { status: "error", message: "Invalid Token" };
}

function submitScore(token, score, gameId, idSoal) {
  const loginCheck = loginStudent(token);
  if (loginCheck.status === "error") return loginCheck;
  const studentOwner = loginCheck.data.owner || "";

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SKOR);
    const idLog = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    sheet.appendRow([idLog, token, idSoal || "", score, gameId, timestamp, studentOwner]);
    return { status: "success", message: "Score saved" };
  } catch (e) {
    return { status: "error", message: "Server busy, try again." };
  } finally {
    lock.releaseLock();
  }
}

function addStudent(name, className, owner) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SISWA);
    const id = Date.now().toString();
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    sheet.appendRow([id, name, token, className, owner]);
    return { status: "success", data: { id, name, token, class: className, owner } };
  } finally {
    lock.releaseLock();
  }
}

function updateStudent(id, name, className, owner) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SISWA);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        // Update Name (Col 2), Class (Col 4), Owner (Col 5)
        // Token (Col 3) remains unchanged
        sheet.getRange(i + 1, 2).setValue(name);
        sheet.getRange(i + 1, 4).setValue(className);
        if (owner) sheet.getRange(i + 1, 5).setValue(owner);
        return { status: "success" };
      }
    }
    return { status: "error", message: "Student ID not found" };
  } finally {
    lock.releaseLock();
  }
}

function deleteStudent(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SISWA);
    const data = sheet.getDataRange().getValues();
    
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        rowToDelete = i + 1;
        break;
      }
    }

    if (rowToDelete > 0) {
      sheet.deleteRow(rowToDelete);
      return { status: "success" };
    }
    return { status: "error", message: "Student ID not found" };
  } finally {
    lock.releaseLock();
  }
}

function getStudents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SISWA);
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  const students = data.map(row => ({
    id: String(row[0]),
    name: row[1],
    token: row[2],
    class: row[3],
    owner: row[4]
  }));
  return { status: "success", data: students };
}

function saveQuestion(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOAL);
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
      params.owner,
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

function deleteQuestion(id) {
   const lock = LockService.getScriptLock();
   try {
     lock.waitLock(10000);
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOAL);
     const data = sheet.getDataRange().getValues();
     
     let rowToDelete = -1;
     for(let i=1; i<data.length; i++) {
       if(String(data[i][0]) === String(id)) {
         rowToDelete = i + 1;
         break;
       }
     }
     
     if (rowToDelete > 0) {
        sheet.deleteRow(rowToDelete);
        return { status: "success" };
     }

     return { status: "error", message: "ID Not Found in Sheet: " + id };
   } catch (e) {
     return { status: "error", message: e.toString() };
   } finally {
     lock.releaseLock();
   }
}

function getScores() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SKOR);
  const data = sheet.getDataRange().getValues();
  data.shift();
  const scores = data.map(row => ({
    id: String(row[0]),
    token: row[1],
    idSoal: row[2],
    score: row[3],
    gameId: row[4],
    timestamp: row[5],
    owner: row[6]
  }));
  return { status: "success", data: scores };
}