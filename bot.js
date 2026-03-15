const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const readline = require("readline")
const { google } = require("googleapis")

// ================= GOOGLE SHEETS =================

const auth = new google.auth.GoogleAuth({
keyFile: "service-account.json",
scopes: ["https://www.googleapis.com/auth/spreadsheets"]
})

const sheets = google.sheets({ version: "v4", auth })

const SPREADSHEET_ID = "1AgdwdBn1C1hS-imfQrI64sg9ezq9GtIAn5dyYT5jjrE"
const SHEET_NAME = "FIX DATA"

// kategori pemasukan
const pemasukanKategori = [
"gaji",
"bonus",
"transfer",
"bayaran",
"komisi",
"dividen",
"penjualan",
"refund",
"hadiah"
]

// kirim data ke spreadsheet
async function kirimKeSheet(kategori, jumlah, keterangan){

try{

const tanggal = new Date().toLocaleDateString("id-ID")

let jenis = "Pengeluaran"

if(pemasukanKategori.includes(kategori.toLowerCase())){
jenis = "Pemasukan"
}

await sheets.spreadsheets.values.append({
spreadsheetId: SPREADSHEET_ID,
range: `${SHEET_NAME}!A:E`,
valueInputOption: "USER_ENTERED",
resource:{
values:[
[tanggal, jenis, kategori, jumlah, keterangan]
]
}
})

console.log("✅ Data masuk spreadsheet")

}catch(err){

console.log("❌ Gagal kirim ke spreadsheet")
console.log(err)

}

}

// ================= WHATSAPP BOT =================

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("session")
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
auth: state,
browser: ["Windows","Chrome","120.0.0.0"]
})

sock.ev.on("creds.update", saveCreds)

// pairing login
if (!sock.authState.creds.registered) {

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
})

rl.question("Masukkan nomor WhatsApp (contoh 628xxxx): ", async (number) => {

const code = await sock.requestPairingCode(number)

console.log("Kode Pairing WhatsApp:", code)

})

}

// status koneksi
sock.ev.on("connection.update", (update) => {

const { connection } = update

if (connection === "open") {
console.log("✅ WhatsApp Connected")
}

if (connection === "close") {

console.log("⚠️ Connection lost, reconnecting in 5 seconds...")

setTimeout(() => {
startBot()
}, 5000)

}

})

// membaca pesan
sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]

if (!msg.message) return

const chatId = msg.key.remoteJid

let text = ""

if (msg.message.conversation) {
text = msg.message.conversation
}

else if (msg.message.extendedTextMessage) {
text = msg.message.extendedTextMessage.text
}

else {
return
}

// ID grup target
const targetGroup = "120363406601077048@g.us"

if (chatId === targetGroup) {

console.log("📩 Pesan:", text)

const parts = text.split(" ")

if(parts.length < 2) return

const kategori = parts[0]
const jumlah = parts[1]
const keterangan = parts.slice(2).join(" ")

console.log("Kategori:", kategori)
console.log("Jumlah:", jumlah)
console.log("Keterangan:", keterangan)

kirimKeSheet(kategori, jumlah, keterangan)

}

})

}

startBot()