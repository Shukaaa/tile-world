import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
	// JS bundle
	{
		input: 'src/index.ts',
		output: [
			{
				file: 'dist/tileworld.esm.js',
				format: 'esm',
			},
			{
				file: 'dist/tileworld.cjs.js',
				format: 'cjs',
			},
			{
				file: 'dist/tileworld.umd.js',
				name: 'TileWorld',
				format: 'umd',
			}
		],
		plugins: [
			nodeResolve(),
			typescript({
				tsconfig: './tsconfig.json',
				declaration: false,
				emitDeclarationOnly: false,
			})
		]
	},

	// D.TS bundle
	{
		input: 'dist/types/index.d.ts',
		output: {
			file: 'dist/index.d.ts',
			format: 'es',
		},
		plugins: [dts()],
	}
];
