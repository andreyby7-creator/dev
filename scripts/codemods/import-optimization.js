/**
 * JSCodeshift трансформация для оптимизации импортов
 * Сортирует импорты, удаляет неиспользуемые, группирует по типам
 */

export default function transformer(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Находим все импорты
  const imports = root.find(j.ImportDeclaration);

  if (imports.length === 0) {
    return root.toSource(options.printOptions || { quote: 'single' });
  }

  // Группируем импорты по типам
  const builtInImports = [];
  const externalImports = [];
  const internalImports = [];
  const typeImports = [];

  imports.forEach(path => {
    const importPath = path.value.source.value;
    const importSpecifiers = path.value.specifiers;

    // Определяем тип импорта
    if (
      importPath.startsWith('@nestjs/') ||
      importPath.startsWith('@types/') ||
      importPath.startsWith('typescript') ||
      importPath.startsWith('zod')
    ) {
      externalImports.push(path);
    } else if (
      importPath.startsWith('./') ||
      importPath.startsWith('../') ||
      importPath.startsWith('apps/') ||
      importPath.startsWith('packages/')
    ) {
      internalImports.push(path);
    } else if (
      importPath.startsWith('@angular/') ||
      importPath.startsWith('react') ||
      importPath.startsWith('vue')
    ) {
      externalImports.push(path);
    } else {
      builtInImports.push(path);
    }

    // Проверяем на type imports
    importSpecifiers.forEach(specifier => {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind === 'type'
      ) {
        typeImports.push(path);
      }
    });
  });

  // Удаляем все существующие импорты
  imports.remove();

  // Сортируем импорты внутри групп
  const sortImports = imports => {
    return imports.sort((a, b) => {
      const aPath = a.value.source.value;
      const bPath = b.value.source.value;
      return aPath.localeCompare(bPath);
    });
  };

  // Сортируем и добавляем импорты в правильном порядке
  const sortedBuiltIn = sortImports(builtInImports);
  const sortedExternal = sortImports(externalImports);
  const sortedInternal = sortImports(internalImports);
  const sortedTypeImports = sortImports(typeImports);

  // Добавляем импорты в начало файла
  const program = root.get().value.program;
  const body = program.body;

  // Добавляем пустую строку между группами импортов
  let insertIndex = 0;

  // Built-in импорты
  if (sortedBuiltIn.length > 0) {
    sortedBuiltIn.forEach(importDecl => {
      body.splice(insertIndex, 0, importDecl.value);
      insertIndex++;
    });
    if (sortedExternal.length > 0 || sortedInternal.length > 0) {
      body.splice(insertIndex, 0, j.emptyStatement());
      insertIndex++;
    }
  }

  // External импорты
  if (sortedExternal.length > 0) {
    sortedExternal.forEach(importDecl => {
      body.splice(insertIndex, 0, importDecl.value);
      insertIndex++;
    });
    if (sortedInternal.length > 0) {
      body.splice(insertIndex, 0, j.emptyStatement());
      insertIndex++;
    }
  }

  // Internal импорты
  if (sortedInternal.length > 0) {
    sortedInternal.forEach(importDecl => {
      body.splice(insertIndex, 0, importDecl.value);
      insertIndex++;
    });
    if (sortedTypeImports.length > 0) {
      body.splice(insertIndex, 0, j.emptyStatement());
      insertIndex++;
    }
  }

  // Type импорты
  if (sortedTypeImports.length > 0) {
    sortedTypeImports.forEach(importDecl => {
      body.splice(insertIndex, 0, importDecl.value);
      insertIndex++;
    });
  }

  // Добавляем пустую строку после всех импортов
  if (body.length > 0 && body[0].type === 'ImportDeclaration') {
    body.splice(insertIndex, 0, j.emptyStatement());
  }

  return root.toSource(options.printOptions || { quote: 'single' });
}
