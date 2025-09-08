/**
 * JSCodeshift трансформация для замены any на unknown
 * Заменяет все использования any типа на unknown для улучшения типизации
 */

export default function transformer(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Находим все TypeAnnotation с any
  root
    .find(j.TSTypeAnnotation)
    .filter(path => {
      return path.value.typeAnnotation.type === 'TSAnyKeyword';
    })
    .forEach(path => {
      // Заменяем any на unknown
      path.value.typeAnnotation = j.tsUnknownKeyword();
    });

  // Находим все TSTypeReference с any
  root
    .find(j.TSTypeReference)
    .filter(path => {
      return path.value.typeName.name === 'any';
    })
    .forEach(path => {
      // Заменяем any на unknown
      path.value.typeName = j.identifier('unknown');
    });

  // Находим все TSTypeParameter с any
  root
    .find(j.TSTypeParameter)
    .filter(path => {
      return (
        path.value.constraint && path.value.constraint.type === 'TSAnyKeyword'
      );
    })
    .forEach(path => {
      // Заменяем constraint any на unknown
      path.value.constraint = j.tsUnknownKeyword();
    });

  // Находим все TSTypeParameter с default any
  root
    .find(j.TSTypeParameter)
    .filter(path => {
      return path.value.default && path.value.default.type === 'TSAnyKeyword';
    })
    .forEach(path => {
      // Заменяем default any на unknown
      path.value.default = j.tsUnknownKeyword();
    });

  return root.toSource(options.printOptions || { quote: 'single' });
}
