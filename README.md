# Informix SPL Formatter

Extensión para **Cursor** / VS Code que formatea procedimientos almacenados en **Informix SPL** (`DEFINE`, `LET`, `IF`/`ELSE`/`END IF`, `FOR`/`FOREACH`, queries, subqueries, etc.).

Los formatters genéricos de SQL (p. ej. `adpyke.vscode-sql-formatter`) no entienden SPL de Informix y suelen romper el archivo. Esta extensión está pensada para ese dialecto.

**ID de la extensión:** `emanuelmanga.informix-spl-formatter`

---

## Qué formatea

| Regla | Descripción |
| --- | --- |
| `DEFINE` / `LET` | Sin línea en blanco entre consecutivos; sí cuando cambia el tipo de sentencia |
| `IF` / `FOR` / `FOREACH` / `WHILE` | Indentación anidada |
| Queries | `SELECT` / `INSERT` / `UPDATE` / `DELETE` con cláusulas (`INTO`, `FROM`, `WHERE`, `AND`, …) |
| Subqueries | Contenido dentro de `(` un nivel más adentro |
| Keywords | Opcional: pasar a mayúsculas |
| Espaciado | Opciones para blancos después de queries, `IF`/`ELSE`/`END IF`, `RETURNING`, etc. |
| Cierres apilados | `END IF` / `END FOR` / `END FOREACH` consecutivos quedan juntos |

---

## Requisitos

- [Cursor](https://cursor.com/) o VS Code `>= 1.74`
- Node.js (solo para el CLI / script de instalación; la extensión en sí no tiene dependencias npm)

---

## Instalación (Cursor / VS Code)

La extensión **no está en el Marketplace**. Se instala copiando los archivos al directorio de extensiones del editor.

### Opción A — Script (recomendado)

```bash
git clone <url-del-repo>
cd extension-cursor   # o el nombre de la carpeta del repo
chmod +x scripts/install-extension.sh
./scripts/install-extension.sh
```

Después:

1. `Ctrl+Shift+P` (o `Cmd+Shift+P` en macOS)
2. Ejecutar **Developer: Reload Window**

El script copia `package.json`, `extension.js` y `formatter.js` a:

```text
~/.cursor/extensions/emanuelmanga.informix-spl-formatter-0.1.0/
```

> Si usás **VS Code** en lugar de Cursor, cambiá la ruta de destino a  
> `~/.vscode/extensions/emanuelmanga.informix-spl-formatter-0.1.0/`  
> (o editá `DEST` en `scripts/install-extension.sh`).

### Opción B — Manual

```bash
mkdir -p ~/.cursor/extensions/emanuelmanga.informix-spl-formatter-0.1.0
cp package.json extension.js formatter.js ~/.cursor/extensions/emanuelmanga.informix-spl-formatter-0.1.0/
```

Luego **Developer: Reload Window**.

### Opción C — Development Host (desarrollo)

1. Abrí esta carpeta en Cursor
2. `F5` o la config **Run Informix SPL Formatter Extension** (`.vscode/launch.json`)
3. Se abre una ventana Extension Development Host con la extensión cargada

### Actualizar después de un `git pull`

```bash
./scripts/install-extension.sh
# Reload Window otra vez
```

---

## Configuración

### Por proyecto (recomendado)

Creá o editá `.vscode/settings.json` en tu repo de SQL:

```json
{
  "[sql]": {
    "editor.defaultFormatter": "emanuelmanga.informix-spl-formatter",
    "editor.formatOnSave": true
  },
  "sql-formatter.uppercase": true,
  "informixSpl.indentSize": 2,
  "informixSpl.useTabs": false,
  "informixSpl.blankAfterQuery": true,
  "informixSpl.blankAfterIf": true,
  "informixSpl.blankAfterReturning": true,
  "informixSpl.blankBeforeElseEndIf": true,
  "informixSpl.keepEndClosersTogether": true
}
```

### Opciones

| Setting | Default | Descripción |
| --- | --- | --- |
| `sql-formatter.uppercase` | `true` | Keywords en mayúsculas |
| `informixSpl.indentSize` | `4` (package) | Espacios por nivel; en este repo de ejemplo suele usarse `2` |
| `informixSpl.useTabs` | `false` | Usar tabs en lugar de espacios |
| `informixSpl.blankAfterQuery` | `true` | Línea en blanco después de `SELECT`/`INSERT`/`UPDATE`/`DELETE` |
| `informixSpl.blankAfterIf` | `true` | Línea en blanco después de `IF…THEN`, `ELSE`, `END IF` |
| `informixSpl.blankAfterReturning` | `true` | Línea en blanco después del último ítem de `RETURNING` |
| `informixSpl.blankBeforeElseEndIf` | `true` | Línea en blanco antes de `ELSE` / `END IF` |
| `informixSpl.keepEndClosersTogether` | `true` | Sin blancos entre cierres consecutivos (`END IF`/`END FOR`/…) |

### Uso

- **Format Document:** `Shift+Alt+F` (Linux/Windows) o `Shift+Option+F` (macOS)
- O con **format on save** si está activado para `[sql]`

---

## CLI (sin abrir el editor)

Formatear un archivo desde la terminal:

```bash
node scripts/format-cli.js entrada.sql salida.sql
# o in-place:
node scripts/format-cli.js mi_proc.sql
```

También:

```bash
npm run format-file -- entrada.sql salida.sql
```

---

## Estructura del repo

```text
extension-cursor/
├── package.json              # Manifiesto de la extensión
├── extension.js              # Activation + DocumentFormattingEditProvider
├── formatter.js              # Motor de formateo Informix SPL
├── scripts/
│   ├── install-extension.sh  # Instala/actualiza en ~/.cursor/extensions
│   └── format-cli.js         # Formateo por CLI
├── .vscode/
│   ├── settings.json         # Settings de ejemplo del proyecto
│   └── launch.json           # F5 / Extension Development Host
└── README.md
```

Archivos principales a versionar: `package.json`, `extension.js`, `formatter.js`, `scripts/`, `.vscode/`, `README.md`.

---

## Subir a Git

```bash
git add package.json extension.js formatter.js scripts/ .vscode/ README.md .gitignore
git status   # revisá que no entren .sql de prueba si no los querés
git commit -m "feat: Informix SPL formatter for Cursor/VS Code"
git remote add origin <url-del-repo>
git push -u origin main
```

En otro máquina:

```bash
git clone <url-del-repo>
cd extension-cursor
./scripts/install-extension.sh
# Reload Window
```

---

## Notas

- Si al recargar ves *Npm task detection: failed to parse package.json*, este repo ya trae `"npm.autoDetect": "off"` en `.vscode/settings.json`.
- Al cambiar la **versión** en `package.json`, actualizá también el nombre de carpeta en `scripts/install-extension.sh` (`…-0.1.0`).
- Publisher / ID: `emanuelmanga.informix-spl-formatter` (debe coincidir con `publisher` + `name` en `package.json` y con `editor.defaultFormatter` en settings).

---

## Licencia

Uso interno / según lo que definas en el repo.
