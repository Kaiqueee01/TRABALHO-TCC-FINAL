const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '..', 'uploads');

function ensureDir(dir) {
  if (fs.existsSync(dir)) {
    const stat = fs.statSync(dir);

    if (stat.isDirectory()) {
      return dir;
    }

    if (stat.size > 0) {
      throw new Error(`Caminho de upload existe, mas nao e pasta: ${dir}`);
    }

    fs.unlinkSync(dir);
  }

  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    if (file.fieldname === 'fotoReceita') {
      cb(null, ensureDir(path.join(uploadsRoot, 'receitas')));
    }
    else if (file.fieldname === 'documento') {
      cb(null, ensureDir(path.join(uploadsRoot, 'documentos')));
    }
    else {
      cb(null, ensureDir(uploadsRoot));
    }
  },

  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf'
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido!'), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});
