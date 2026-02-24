path = '/home/philippe/Desktop/solo/VBG_fixed/backend/frontend/admin/admin.html'
content = open(path).read()

old = '<!-- ADMIN -->\n<div id="admin-screen">'
new = '''<!-- ADMIN -->
<div id="admin-screen">

  <button class="hamburger" id="hamburger-btn" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>

  <div class="sidebar-overlay" id="sidebar-overlay"></div>'''

if old in content:
    content = content.replace(old, new)
    open(path, 'w').write(content)
    print('OK - hamburger ajouté')
else:
    print('ERREUR - balise non trouvée')
    # Afficher ce qui est autour de admin-screen
    idx = content.find('admin-screen')
    print(repr(content[idx-30:idx+50]))
