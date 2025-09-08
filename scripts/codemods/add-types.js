/**
 * JSCodeshift трансформация для добавления типов
 * Добавляет типы для переменных, параметров и возвращаемых значений
 */

export default function transformer(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Добавляем типы для параметров функций без типов
  root.find(j.FunctionDeclaration).forEach(path => {
    const params = path.value.params;
    params.forEach(param => {
      if (!param.typeAnnotation) {
        // Добавляем unknown тип для параметров без типов
        param.typeAnnotation = j.tsTypeAnnotation(j.tsUnknownKeyword());
      }
    });

    // Добавляем тип возвращаемого значения если его нет
    if (!path.value.returnType) {
      path.value.returnType = j.tsTypeAnnotation(j.tsUnknownKeyword());
    }
  });

  // Добавляем типы для arrow functions
  root.find(j.ArrowFunctionExpression).forEach(path => {
    const params = path.value.params;
    params.forEach(param => {
      if (!param.typeAnnotation) {
        param.typeAnnotation = j.tsTypeAnnotation(j.tsUnknownKeyword());
      }
    });

    // Добавляем тип возвращаемого значения если его нет
    if (!path.value.returnType) {
      path.value.returnType = j.tsTypeAnnotation(j.tsUnknownKeyword());
    }
  });

  // Добавляем типы для переменных без типов
  root
    .find(j.VariableDeclarator)
    .filter(path => {
      return !path.value.id.typeAnnotation && path.value.init;
    })
    .forEach(path => {
      // Определяем тип на основе значения
      let typeAnnotation;

      if (path.value.init.type === 'StringLiteral') {
        typeAnnotation = j.tsTypeAnnotation(j.tsStringKeyword());
      } else if (path.value.init.type === 'NumericLiteral') {
        typeAnnotation = j.tsTypeAnnotation(j.tsNumberKeyword());
      } else if (path.value.init.type === 'BooleanLiteral') {
        typeAnnotation = j.tsTypeAnnotation(j.tsBooleanKeyword());
      } else if (path.value.init.type === 'ArrayExpression') {
        typeAnnotation = j.tsTypeAnnotation(
          j.tsArrayType(j.tsUnknownKeyword())
        );
      } else if (path.value.init.type === 'ObjectExpression') {
        typeAnnotation = j.tsTypeAnnotation(
          j.tsTypeReference(
            j.identifier('Record'),
            j.tsTypeParameterInstantiation([
              j.tsStringKeyword(),
              j.tsUnknownKeyword(),
            ])
          )
        );
      } else {
        typeAnnotation = j.tsTypeAnnotation(j.tsUnknownKeyword());
      }

      path.value.id.typeAnnotation = typeAnnotation;
    });

  // Добавляем типы для методов классов
  root.find(j.MethodDefinition).forEach(path => {
    const value = path.value.value;

    if (value.type === 'FunctionExpression') {
      const params = value.params;
      params.forEach(param => {
        if (!param.typeAnnotation) {
          param.typeAnnotation = j.tsTypeAnnotation(j.tsUnknownKeyword());
        }
      });

      // Добавляем тип возвращаемого значения если его нет
      if (!value.returnType) {
        value.returnType = j.tsTypeAnnotation(j.tsUnknownKeyword());
      }
    }
  });

  return root.toSource(options.printOptions || { quote: 'single' });
}
