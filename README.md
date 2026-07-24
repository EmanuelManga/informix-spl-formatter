# Informix SPL Formatter

Extensión para **Cursor** / VS Code que formatea procedimientos almacenados en **Informix SPL** (`DEFINE`, `LET`, `IF`/`ELSE`/`END IF`, `FOR`/`FOREACH`, queries, subqueries, etc.).

Los formatters genéricos de SQL (p. ej. `adpyke.vscode-sql-formatter`) no entienden SPL de Informix y suelen romper el archivo. Esta extensión está pensada para ese dialecto.

**ID de la extensión:** `emanuelmanga.informix-spl-formatter`

---

## Qué formatea

| Regla                              | Descripción                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `DEFINE` / `LET`                   | Sin línea en blanco entre consecutivos; sí cuando cambia el tipo de sentencia               |
| `IF` / `FOR` / `FOREACH` / `WHILE` | Indentación anidada                                                                         |
| Queries                            | `SELECT` / `INSERT` / `UPDATE` / `DELETE` con cláusulas (`INTO`, `FROM`, `WHERE`, `AND`, …) |
| Subqueries                         | Contenido dentro de `(` un nivel más adentro                                                |
| Keywords                           | Opcional: pasar a mayúsculas                                                                |
| Espaciado                          | Opciones para blancos después de queries, `IF`/`ELSE`/`END IF`, `RETURNING`, etc.           |
| Cierres apilados                   | `END IF` / `END FOR` / `END FOREACH` consecutivos quedan juntos                             |

---

## Requisitos

- [Cursor](https://cursor.com/) o VS Code `>= 1.74`

---

## Instalación

La extensión **no está en el Marketplace**. Se instala copiando los archivos al directorio de extensiones del editor.

```bash
git clone https://github.com/EmanuelManga/informix-spl-formatter.git
cd informix-spl-formatter

mkdir -p ~/.cursor/extensions/emanuelmanga.informix-spl-formatter-0.1.0
cp package.json extension.js formatter.js ~/.cursor/extensions/emanuelmanga.informix-spl-formatter-0.1.0/
```

Después:

1. `Ctrl+Shift+P` (o `Cmd+Shift+P` en macOS)
2. Ejecutar **Developer: Reload Window**

> Si usás **VS Code** en lugar de Cursor, el destino es  
> `~/.vscode/extensions/emanuelmanga.informix-spl-formatter-0.1.0/`

### Actualizar

```bash
git pull
cp package.json extension.js formatter.js ~/.cursor/extensions/emanuelmanga.informix-spl-formatter-0.1.0/
# Reload Window otra vez
```

---

## Configuración

En tu proyecto de SQL, creá o editá `.vscode/settings.json`:

```json
{
    "[sql]": {
        "editor.defaultFormatter": "emanuelmanga.informix-spl-formatter",
        "editor.formatOnSave": true
    },
    "informixSpl.uppercase": true,
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

| Setting                              | Default | Descripción                                                    |
| ------------------------------------ | ------- | -------------------------------------------------------------- |
| `informixSpl.uppercase`              | `true`  | Keywords en mayúsculas                                         |
| `informixSpl.indentSize`             | `4`     | Espacios por nivel                                             |
| `informixSpl.useTabs`                | `false` | Usar tabs en lugar de espacios                                 |
| `informixSpl.blankAfterQuery`        | `true`  | Línea en blanco después de `SELECT`/`INSERT`/`UPDATE`/`DELETE` |
| `informixSpl.blankAfterIf`           | `true`  | Línea en blanco después de `IF…THEN`, `ELSE`, `END IF`         |
| `informixSpl.blankAfterReturning`    | `true`  | Línea en blanco después del último ítem de `RETURNING`         |
| `informixSpl.blankBeforeElseEndIf`   | `true`  | Línea en blanco antes de `ELSE` / `END IF`                     |
| `informixSpl.keepEndClosersTogether` | `true`  | Sin blancos entre cierres consecutivos (`END IF`/`END FOR`/…)  |

---

## Estructura del repo

```text
informix-spl-formatter/
├── package.json    # Manifiesto de la extensión
├── extension.js    # Activation + DocumentFormattingEditProvider
├── formatter.js    # Motor de formateo Informix SPL
├── LICENSE
└── README.md
```

---

## Notas

- Al cambiar la **versión** en `package.json`, actualizá también el nombre de la carpeta de instalación (`…-0.1.0`).
- Publisher / ID: `emanuelmanga.informix-spl-formatter` (debe coincidir con `publisher` + `name` en `package.json` y con `editor.defaultFormatter` en settings).

---

## Licencia

[MIT](./LICENSE)
