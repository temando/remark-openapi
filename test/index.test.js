import 'isomorphic-fetch';
import fetchMock from 'fetch-mock';
import fs from 'fs-extra';
import parse from 'remark-parse';
import stringify from 'remark-stringify';
import toVFile from 'to-vfile';
import unified from 'unified';
import openapi from './../src';

const fixturesDir = `${__dirname}/fixtures`;
const remark = unified().use(parse).use(stringify).freeze();

const REGEX_NEWLINE = /\r\n|\r|\n/;

describe('remark-openapi', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('ignores markdown that does not have openapi references', async () => {
    const originalContents = '# This is a demo';
    const processedVfile = await remark().use(openapi).process(originalContents);

    expect(fetchMock.called()).toBeFalsy();
    expect(originalContents).toEqual(processedVfile.contents.trim());
    expect(processedVfile.messages).toHaveLength(0);
  });

  it('can handle errors when fetching openapi files', async () => {
    // Set fetch mock to fail
    const response = new Response(
      {
        message: '404 Not found',
      },
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
    fetchMock.get('*', response);

    // Execute
    const srcFile = `${fixturesDir}/md/link-openapi-remote.md`;
    const vfile = toVFile.readSync(srcFile);
    const processedVfile = await remark().use(openapi).process(vfile);

    // Verify
    expect(fetchMock.calls().matched).toHaveLength(2);
    expect(processedVfile.messages).toHaveLength(2);
    expect(processedVfile.messages[0].message).toMatch('Failed processing spec file');
  });

  it('can handle remote openapi links', async () => {
    // Configure fetch mock
    const responseBody = fs.readFileSync(`${fixturesDir}/assets/petstore-open-api.json`, 'utf8');
    const response = {
      body: responseBody,
    };
    fetchMock.get('*', response);

    // Execute
    const srcFile = `${fixturesDir}/md/link-openapi-remote.md`;
    const vfile = toVFile.readSync(srcFile);
    const processedVfile = await remark().use(openapi).process(vfile);

    // Verify
    expect(fetchMock.calls().matched).toHaveLength(2);
    expect(processedVfile.messages).toHaveLength(2);

    const generatedContents = processedVfile.contents;
    expect(generatedContents).toMatch('# swagger link 1');
    expect(generatedContents).toMatch('# swagger link 2');

    const linesStartingWithPipe = generatedContents.split(REGEX_NEWLINE).filter(line => line && line.indexOf('|') === 0);
    expect(linesStartingWithPipe).toHaveLength(10);
  });

  it('can handle local openapi links', async () => {
    // Execute
    const srcFile = `${fixturesDir}/md/link-openapi-local.md`;
    const vfile = toVFile.readSync(srcFile);
    const processedVfile = await remark().use(openapi).process(vfile);

    // Verify
    expect(fetchMock.calls().matched).toHaveLength(0);
    expect(processedVfile.messages).toHaveLength(1);

    const generatedContents = processedVfile.contents;
    expect(generatedContents).toMatch('# swagger link');

    const linesStartingWithPipe = generatedContents.split(REGEX_NEWLINE).filter(line => line && line.indexOf('|') === 0);
    expect(linesStartingWithPipe).toHaveLength(5);
  });

  it('can handle swagger links', async () => {
    // Execute
    const srcFile = `${fixturesDir}/md/link-swagger-local.md`;
    const vfile = toVFile.readSync(srcFile);
    const processedVfile = await remark().use(openapi).process(vfile);

    // Verify
    expect(fetchMock.calls().matched).toHaveLength(0);
    expect(processedVfile.messages).toHaveLength(2);
    expect(processedVfile.messages[0].message).toMatch('`swagger` is deprecated');
  });
});
