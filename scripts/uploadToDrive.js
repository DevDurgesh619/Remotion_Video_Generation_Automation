const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

// ==================== CONFIG ====================

// Level 1.2 prompt titles mapped by explicit ID
const PROMPT_TITLES = {
  101: "Three Shapes Center Bounce",
  102: "Shapes Horizontal Align Pulse",
  103: "Sequential Shape Reveal",
  104: "Bar Chart Three Bars",
  105: "Bar Chart with Counter",
  106: "Circles Orbit Center",
  107: "Square Grid Appear Sequential",
  108: "Triangles Point Inward",
  109: "Line Star Burst",
  110: "Rectangles Layered Slide",
  111: "Circle Chain Connected",
  112: "Shapes Size Progression",
  113: "Triangle Spinning Formation",
  114: "Square Border Sequential Build",
  115: "Circles Merge Split",
  116: "Pentagon Ring Rotate",
  117: "Bar Graph Comparison",
  118: "Staggered Timing Variation",
  119: "Circles Shadow Depth",
  120: "Lines Form Grid",
  121: "Shapes Gradient Overlap",
  122: "Pulse Wave Through Row",
  123: "Rectangles Aspect Ratio",
  124: "Triangle Stack Pyramid",
  125: "Color Cycling Coordination",
  126: "Opacity Fade Pattern",
  127: "Rotation Direction Contrast",
  128: "Scale Coordination Inverse",
  129: "Line Star Formation",
  130: "Rectangles Bridge Build",
  131: "Circles Radial Expand",
  132: "Sequential Color Fill",
  133: "Triangle Wave Motion",
  134: "Squares Perspective Depth",
  135: "Circle Orbit Complex",
  136: "Bar Graph Race",
  137: "Glow Pulse Synchronize",
  138: "Rotation Speed Variation",
  139: "Lines Grid Fade In",
  140: "Shapes Bounce Sequence",
  141: "Concentric Rings Expand",
  142: "Rectangle Cascade Fall",
  143: "Triangles Mirror Symmetry",
  144: "Grid Cells Sequential",
  145: "Shadow Direction Wave",
  146: "Lines Perpendicular Weave",
  147: "Shapes Color Sync",
  148: "Rectangles Interlock",
  149: "Opacity Gradient Cascade",
  150: "Complex Coordinated Finale"
};

// Local folder with all outputs
const OUTPUT_DIR = path.join(__dirname, "..", "outputs");

// OAuth config
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");
const TOKEN_PATH = path.join(__dirname, "..", "token.json");

// Drive folder names
const ROOT_FOLDER_NAME = "Automation";
const LEVEL_FOLDER_NAME = "Level 1.2(v2_Almost_Perfect): Multi_Shape_Cordination_Animation";
const CODE_FOLDER_NAME = "Code";
const VIDEOS_FOLDER_NAME = "Videos";

// ==================== AUTH ====================

async function loadCredentialsAndAuthorize() {
  const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
  const credentials = JSON.parse(content);

  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] // typically "http://localhost"
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  return await getAccessToken(oAuth2Client);
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\nAuthorize this app by visiting this URL:\n");
  console.log(authUrl);
  console.log(
    "\nAfter you click Allow, you will be redirected to a URL like:\n" +
      "  http://localhost/?code=XXXXXXXX&scope=...\n" +
      "Copy ONLY the value of the code parameter and paste it below.\n"
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Enter the authorization code here: ", (codeInput) => {
      rl.close();
      const code = codeInput.trim();

      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error("Error retrieving access token:", err.message);
          return reject(err);
        }
        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), "utf-8");
        console.log("Token stored to", TOKEN_PATH);
        resolve(oAuth2Client);
      });
    });
  });
}

// ==================== DRIVE FOLDER HELPERS ====================

async function ensureFolder(drive, name, parentId = null) {
  const qParts = [
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `name = '${name.replace(/'/g, "\\'")}'`,
  ];

  if (parentId) {
    qParts.push(`'${parentId}' in parents`);
  } else {
    qParts.push("'root' in parents");
  }

  const res = await drive.files.list({
    q: qParts.join(" and "),
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name",
  });

  console.log("Created folder:", createRes.data.name, "->", createRes.data.id);
  return createRes.data.id;
}

// ==================== UTILS ====================

function makeSafeFileName(title, ext) {
  const base = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").trim();
  return base + ext;
}

function getTitleForIndex(index) {
  return PROMPT_TITLES[index] || null;
}

function getIndexFromFileName(fileName) {
  const match = fileName.match(/_(\d+)\./);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (isNaN(num)) return null;
  return num;
}

function guessMimeType(ext) {
  const lower = ext.toLowerCase();
  if (lower === ".mp4") return "video/mp4";
  if (lower === ".tsx") return "text/plain";
  return "application/octet-stream";
}

// ==================== DRIVE UPLOAD ====================

async function uploadFileToFolder(auth, localPath, driveName, folderId) {
  const drive = google.drive({ version: "v3", auth });

  const ext = path.extname(driveName);
  const mimeType = guessMimeType(ext);

  const requestBody = {
    name: driveName,
    parents: [folderId],
  };

  const res = await drive.files.create({
    requestBody,
    media: {
      mimeType,
      body: fs.createReadStream(localPath),
    },
    fields: "id, name, parents",
  });

  console.log("Uploaded:", res.data.name, "->", res.data.id);
  return res.data.id;
}

// ==================== MAIN ====================

async function run() {
  const auth = await loadCredentialsAndAuthorize();
  console.log("Authorized successfully ✅");

  if (!fs.existsSync(OUTPUT_DIR)) {
    throw new Error(`Output directory does not exist: ${OUTPUT_DIR}`);
  }

  const drive = google.drive({ version: "v3", auth });

  // 1) Ensure folder tree:
  // Automation /
  //   LEVEL 1.2: MULTI-SHAPE COORDINATION /
  //     Code
  //     Videos
  const automationFolderId = await ensureFolder(drive, ROOT_FOLDER_NAME, null);
  const targetLevelFolderId = await ensureFolder(
    drive,
    LEVEL_FOLDER_NAME,
    automationFolderId
  );
  const codeFolderId = await ensureFolder(
    drive,
    CODE_FOLDER_NAME,
    targetLevelFolderId
  );
  const videosFolderId = await ensureFolder(
    drive,
    VIDEOS_FOLDER_NAME,
    targetLevelFolderId
  );

  const files = fs.readdirSync(OUTPUT_DIR);
  const targetFiles = files.filter((f) => /\.(tsx|mp4)$/i.test(f));

  if (targetFiles.length === 0) {
    console.log("No .tsx or .mp4 files found in:", OUTPUT_DIR);
    return;
  }

  for (const file of targetFiles) {
    const index = getIndexFromFileName(file);
    if (!index) {
      console.warn(`Skipping ${file} (could not extract index from name)`);
      continue;
    }

   // Only process files if they belong to this batch (1-50)

    const title = getTitleForIndex(index);
    if (!title) {
      console.warn(`Skipping ${file} (no prompt title for index ${index})`);
      continue;
    }

    const ext = path.extname(file); // .tsx or .mp4
    const safeName = makeSafeFileName(title, ext);
    const localPath = path.join(OUTPUT_DIR, file);

    let targetFolderId;
    if (ext.toLowerCase() === ".tsx") {
      targetFolderId = codeFolderId;
      console.log(
        `Uploading ${file} as "${safeName}" to Automation/${LEVEL_FOLDER_NAME}/Code`
      );
    } else if (ext.toLowerCase() === ".mp4") {
      targetFolderId = videosFolderId;
      console.log(
        `Uploading ${file} as "${safeName}" to Automation/${LEVEL_FOLDER_NAME}/Videos`
      );
    } else {
      console.warn(`Skipping ${file} (unsupported extension ${ext})`);
      continue;
    }

    await uploadFileToFolder(auth, localPath, safeName, targetFolderId);
  }

  console.log("All uploads done ✅");
}

run().catch((err) => {
  console.error("Script failed:", err);
});