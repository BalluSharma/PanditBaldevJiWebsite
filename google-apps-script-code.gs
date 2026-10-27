/* ============================================================
   YAJMAN FORM → GOOGLE SHEET + EMAIL NOTIFICATION  (v2)
   ------------------------------------------------------------
   - Booking aur Contact dono form ka data isi sheet me aayega
   - Naye form fields ke liye columns apne aap ban jate hain
   - Har naye form par NOTIFY_EMAIL par email aata hai
   ============================================================ */

const NOTIFY_EMAIL = "officialpanditbaldevsharma@gmail.com";

// Sheet me columns ka pasandida order (jo field na mile wo khaali rahega,
// aur koi naya field aaye to wo end me apne aap jud jayega)
const PREFERRED_COLUMNS = [
  "Submitted At", "Form", "Full Name", "Name", "Phone Number", "Phone",
  "WhatsApp Number", "Email", "Permanent Address", "City", "State", "Pincode",
  "Puja Type", "Preferred Date", "Preferred Time", "Puja Mode", "Samagri",
  "Puja Venue Address", "Guests", "Occasion", "Message"
];

function doPost(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  // Spam trap: bots hidden 'website' field bhar dete hain
  if (params["website"]) {
    return json_({ status: "ignored" });
  }
  delete params["website"];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // ek saath aayi submissions line se likhi jaayengi
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Current header row padho (ya pehli baar banao)
    let headers = [];
    if (sheet.getLastRow() > 0) {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
        .map(String).filter(String);
    }
    if (headers.length === 0) {
      headers = PREFERRED_COLUMNS.slice();
    }
    // Naye fields ke liye columns jodo
    Object.keys(params).forEach(function (k) {
      if (headers.indexOf(k) === -1) headers.push(k);
    });

    // Header row likho aur style karo
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight("bold").setBackground("#fde9c9");
    sheet.setFrozenRows(1);

    // Row banao (Sheets formula injection se bachne ke liye = + - @ se shuru hone par ' lagate hain)
    const row = headers.map(function (h) {
      let v = params[h] === undefined ? "" : String(params[h]);
      if (/^[=+\-@]/.test(v)) v = "'" + v;
      return v;
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }

  // Email notification
  try {
    const formType = params["Form"] || "Website";
    const name = params["Full Name"] || params["Name"] || "N/A";
    const phone = params["Phone Number"] || params["Phone"] || "N/A";
    const puja = params["Puja Type"] ? " - " + params["Puja Type"] : "";

    let body = "Naya \"" + formType + "\" form bhara gaya hai:\n\n";
    Object.keys(params).forEach(function (k) {
      if (k !== "Form") body += k + ": " + (params[k] || "-") + "\n";
    });
    body += "\n(Sheet me bhi save ho gaya hai.)";

    const mail = {
      to: NOTIFY_EMAIL,
      subject: "Naya " + formType + " Request" + puja + " | " + name + " (" + phone + ")",
      body: body
    };
    // Reply dabane par seedha yajman ko jaye (agar unhone email di ho)
    if (params["Email"] && /^\S+@\S+\.\S+$/.test(params["Email"])) {
      mail.replyTo = params["Email"];
    }
    MailApp.sendEmail(mail);
  } catch (err) {
    // Email fail ho to bhi sheet me data save rahega
  }

  return json_({ status: "success" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Browser me web app URL kholne par ye dikhega (test ke liye)
// ?email=...&callback=... diya ho to sirf usi email ki bookings JSONP me wapas aati hain
// (Account Dashboard isi se "My Bookings" dikhata hai — JSONP isliye taaki
//  browser se seedha padha ja sake, CORS ki dikkat na aaye)
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const email = params.email ? String(params.email).trim().toLowerCase() : "";
  const callback = params.callback ? String(params.callback).replace(/[^a-zA-Z0-9_]/g, "") : "";

  if (!email) {
    return ContentService.createTextOutput("Yajman form connector is live");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values.length > 0 ? values[0].map(String) : [];
  const emailCol = headers.indexOf("Email");

  const bookings = [];
  if (emailCol !== -1) {
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowEmail = String(row[emailCol] || "").trim().toLowerCase();
      if (rowEmail && rowEmail === email) {
        const obj = {};
        headers.forEach(function (h, idx) { obj[h] = row[idx]; });
        bookings.push(obj);
      }
    }
  }

  const payload = { bookings: bookings };
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(payload) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(payload);
}
