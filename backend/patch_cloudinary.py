import re

path = '/home/philippe/Desktop/solo/VBG_fixed/backend/server.js'
content = open(path).read()

# 1. Ajouter les requires cloudinary avant multer
cloudinary_require = """
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'vbg-temoignages',
    resource_type: file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('audio') ? 'video' : 'image',
    public_id: Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9]/g, '_'),
  }),
});

"""

# Ajouter avant "const multer"
content = content.replace("const multer", cloudinary_require + "const multer", 1)

# 2. Remplacer diskStorage par cloudinaryStorage
content = re.sub(
    r'const storage = multer\.diskStorage\(\{.*?\}\);',
    'const storage = cloudinaryStorage;',
    content,
    flags=re.DOTALL
)

# 3. Remplacer le chemin local par l'URL Cloudinary dans la réponse
content = content.replace(
    "path: file.path",
    "path: file.path || file.secure_url || ''"
)

open(path, 'w').write(content)
print('OK - server.js modifié')
