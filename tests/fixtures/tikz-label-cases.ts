export const tikzLabelCases = [
	{
		name: "path shorthand math label",
		code: String.raw`\draw (0,0) to[L=$L_F$] (2,0);`,
		expectedLabel: "L_F",
	},
	{
		name: "path label on other side",
		code: String.raw`\draw (0,0) to[R, l_=$R_{ESR}$] (0,-2);`,
		expectedLabel: "R_{ESR}",
		expectedOtherSide: true,
	},
	{
		name: "node label with font command",
		code: String.raw`\node[above] at (3.5, 9.8) {\small $V_{IN}$};`,
		expectedText: "V_{IN}",
		expectedMath: true,
	},
	{
		name: "node label with bold math",
		code: String.raw`\draw (-1.5, 6) node[above] {$\mathbf{V_{LV}}$};`,
		expectedText: String.raw`\mathbf{V_{LV}}`,
		expectedMath: true,
	},
]
