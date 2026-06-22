"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mathDefinitions = exports.multiplyDef = exports.addDef = exports.constNumberDef = void 0;
/**
 * Math node definitions with implementations for testing.
 */
exports.constNumberDef = {
    context: 'js',
    name: 'number',
    category: 'const',
    icon: 'hash',
    outputs: [{ name: 'value', type: 'number' }],
    props: [{ name: 'value', type: 'number', default: 0 }],
    description: 'Outputs a constant number value',
    impl: (_inputs, props) => ({
        value: props.value ?? 0
    })
};
exports.addDef = {
    context: 'js',
    name: 'add',
    category: 'math',
    icon: 'plus',
    inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
    ],
    outputs: [{ name: 'sum', type: 'number' }],
    description: 'Adds two numbers',
    impl: (inputs) => ({
        sum: (inputs.a ?? 0) + (inputs.b ?? 0)
    })
};
exports.multiplyDef = {
    context: 'js',
    name: 'multiply',
    category: 'math',
    icon: 'x',
    inputs: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
    ],
    outputs: [{ name: 'product', type: 'number' }],
    description: 'Multiplies two numbers',
    impl: (inputs) => ({
        product: (inputs.a ?? 0) * (inputs.b ?? 0)
    })
};
exports.mathDefinitions = [
    exports.constNumberDef,
    exports.addDef,
    exports.multiplyDef
];
