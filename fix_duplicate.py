path = '/home/philippe/Desktop/solo/VBG_fixed/backend/frontend/admin/admin.html'
content = open(path).read()

# Supprimer le doublon du hamburger+overlay
duplicate = '''
  <button class="hamburger" id="hamburger-btn" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>

  <div class="sidebar-overlay" id="sidebar-overlay"></div>'''

count = content.count(duplicate)
print(f'Nombre de doublons: {count}')

if count == 2:
    # Garder seulement la première occurrence
    idx = content.find(duplicate)
    idx2 = content.find(duplicate, idx + 1)
    content = content[:idx2] + content[idx2 + len(duplicate):]
    open(path, 'w').write(content)
    print('OK - doublon supprimé')
else:
    print('Pas de doublon trouvé')
