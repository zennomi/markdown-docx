import { MathIntegral, MathSum } from 'docx';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import katex from 'katex';
import markdownToDocx, { Packer } from '../src/entry-node';
import { mathmlToDocxChildren } from '../src/extensions/mathml-to-docx';

const __dirname = new URL('.', import.meta.url).pathname;

type MathLike = { root?: unknown[] };

const extractMathText = (nodes: unknown[]): string => {
  const parts: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      parts.push(value);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const maybeRoot = (value as MathLike).root;
    if (Array.isArray(maybeRoot)) {
      maybeRoot.forEach(walk);
    }
  };

  nodes.forEach(walk);
  return parts.join('');
};

describe('Math Rendering', () => {
  it('render comprehensive math example', async () => {
    const doc = await markdownToDocx(getDefaultMathExample());
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeInstanceOf(Buffer);
    // Optionally, write to file for manual inspection
    const outputPath = path.join(__dirname, 'test-math-comprehensive.docx');
    await fs.writeFile(outputPath, buffer);
    console.log('✅ Successfully created test-math-comprehensive.docx');
    // check file exists
    const stat = await fs.stat(outputPath);
    expect(stat.isFile()).toBe(true);
  })

  // read file
  it('render math example from file', async () => {
    const markdown = await fs.readFile(path.join(__dirname, 'math-example.md'), 'utf-8');
    const doc = await markdownToDocx(markdown);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeInstanceOf(Buffer);
    // Optionally, write to file for manual inspection
    const outputPath = path.join(__dirname, 'math-example-from-file.docx');
    await fs.writeFile(outputPath, buffer);
    console.log('✅ Successfully created math-example-from-file.docx');
    // check file exists
    const stat = await fs.stat(outputPath);
    expect(stat.isFile()).toBe(true);
  });

  it('preserves base symbols in accent expressions', () => {
    const vecF = mathmlToDocxChildren(katex.renderToString('\\vec{F}', { output: 'mathml', throwOnError: false }));
    expect(vecF).toHaveLength(1);
    expect((vecF[0] as { rootKey?: string }).rootKey).toBe('m:acc');
    expect(extractMathText(vecF)).toContain('F');

    const hatX = mathmlToDocxChildren(katex.renderToString('\\hat{x}', { output: 'mathml', throwOnError: false }));
    expect(hatX).toHaveLength(1);
    expect((hatX[0] as { rootKey?: string }).rootKey).toBe('m:acc');
    expect(extractMathText(hatX)).toContain('x');

    const overlineAB = mathmlToDocxChildren(katex.renderToString('\\overline{AB}', { output: 'mathml', throwOnError: false }));
    expect(overlineAB).toHaveLength(1);
    expect((overlineAB[0] as { rootKey?: string }).rootKey).toBe('m:acc');
    const overlineText = extractMathText(overlineAB);
    expect(overlineText).toContain('A');
    expect(overlineText).toContain('B');

    const vecExpr = mathmlToDocxChildren(katex.renderToString('\\vec{x+y}', { output: 'mathml', throwOnError: false }));
    expect(vecExpr).toHaveLength(1);
    expect((vecExpr[0] as { rootKey?: string }).rootKey).toBe('m:acc');
    const vecExprText = extractMathText(vecExpr);
    expect(vecExprText).toContain('x');
    expect(vecExprText).toContain('+');
    expect(vecExprText).toContain('y');
  });

  it('keeps n-ary sum/integral conversion behavior', () => {
    const sumChildren = mathmlToDocxChildren(katex.renderToString('\\sum_{i=1}^{n} i', { output: 'mathml', throwOnError: false }));
    expect(sumChildren[0]).toBeInstanceOf(MathSum);

    const integralChildren = mathmlToDocxChildren(katex.renderToString('\\int_0^1 x\\,dx', { output: 'mathml', throwOnError: false }));
    expect(integralChildren[0]).toBeInstanceOf(MathIntegral);
  });
});


function getDefaultMathExample() {
  const markdown = `# Math Equation Test

## Inline Math

Here is an inline equation: $E=mc^2$ which is Einstein's famous formula.

Another example: $a^2 + b^2 = c^2$ is the Pythagorean theorem.

Greek letters: $\\alpha + \\beta = \\gamma$

## Block Math

Here is a block equation:

$$
E=mc^2
$$

Another block equation:

$$
x^2 + y^2 = z^2
$$

With Greek letters:

$$
\\alpha + \\beta + \\gamma = \\pi
$$

## End of Test

This document tests basic LaTeX math rendering.
`;
  return markdown;
}
