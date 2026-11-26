import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Code2, Play, RotateCcw, ShieldCheck, Terminal, XCircle } from 'lucide-react';

const challenges = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topic: 'Arrays · Hash maps',
    prompt: 'Given an array of integers and a target, return the indices of the two numbers that add up to the target. Assume exactly one solution exists.',
    signature: 'twoSum(nums, target)',
    functionName: 'twoSum',
    starter: 'function twoSum(nums, target) {\n  // Write your solution here\n  return [];\n}',
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] }
    ],
    hint: 'A hash map can store each number and its index as you scan the array.'
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    topic: 'Strings · Two pointers',
    prompt: 'Return a new string with the characters in reverse order. Do not mutate the input.',
    signature: 'reverseString(value)',
    functionName: 'reverseString',
    starter: 'function reverseString(value) {\n  // Write your solution here\n  return value;\n}',
    tests: [
      { args: ['hello'], expected: 'olleh' },
      { args: ['InterviewOS'], expected: 'SOweivretnI' },
      { args: ['a'], expected: 'a' }
    ],
    hint: 'JavaScript strings can be converted to arrays with Array.from().'
  },
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    topic: 'Strings · Normalisation',
    prompt: 'Return true if the input reads the same forward and backward after converting to lowercase and removing non-alphanumeric characters.',
    signature: 'isPalindrome(value)',
    functionName: 'isPalindrome',
    starter: 'function isPalindrome(value) {\n  // Write your solution here\n  return false;\n}',
    tests: [
      { args: ['A man, a plan, a canal: Panama'], expected: true },
      { args: ['race a car'], expected: false },
      { args: [' '], expected: true }
    ],
    hint: 'Normalise the string first, then compare it with its reverse.'
  }
];

function sameValue(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export default function CodingPractice() {
  const [selectedId, setSelectedId] = useState(challenges[0].id);
  const [code, setCode] = useState(challenges[0].starter);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const selected = useMemo(() => challenges.find(item => item.id === selectedId) || challenges[0], [selectedId]);

  function chooseChallenge(id) {
    const next = challenges.find(item => item.id === id);
    if (!next) return;
    setSelectedId(id);
    setCode(next.starter);
    setResults(null);
    setShowHint(false);
  }

  function resetCode() {
    setCode(selected.starter);
    setResults(null);
  }

  function runCode() {
    if (running) return;
    setRunning(true);
    setResults(null);
    const payload = JSON.stringify({ code, functionName: selected.functionName, tests: selected.tests });
    const source = `
      self.fetch = () => Promise.reject(new Error('Network access is disabled in this practice runner.'));
      self.XMLHttpRequest = undefined;
      self.WebSocket = undefined;
      self.EventSource = undefined;
      self.importScripts = undefined;
      self.indexedDB = undefined;
      self.caches = undefined;
      self.onmessage = (event) => {
        const input = event.data;
        try {
          const factory = new Function(input.code + '\\nreturn ' + input.functionName + ';');
          const candidate = factory();
          if (typeof candidate !== 'function') throw new Error('Define the required function: ' + input.functionName);
          const output = input.tests.map((test, index) => {
            try {
              const actual = candidate(...test.args);
              return { index, passed: JSON.stringify(actual) === JSON.stringify(test.expected), actual, expected: test.expected };
            } catch (error) {
              return { index, passed: false, error: error.message, expected: test.expected };
            }
          });
          self.postMessage({ results: output });
        } catch (error) {
          self.postMessage({ error: error.message || 'Unable to run this solution.' });
        }
      };
    `;
    const workerUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const worker = new Worker(workerUrl);
    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      setResults(value);
      setRunning(false);
    };
    const timeout = window.setTimeout(() => finish({ error: 'Execution timed out. Check for an infinite loop and try again.' }), 1500);
    worker.onmessage = event => finish(event.data);
    worker.onerror = () => finish({ error: 'The runner could not execute this code. Check the syntax and try again.' });
    worker.postMessage(JSON.parse(payload));
  }

  const passed = results?.results?.filter(item => item.passed).length ?? 0;

  return (
    <section className="coding-workspace">
      <div className="page-heading">
        <div><div className="eyebrow">BUILD PROBLEM-SOLVING SKILLS</div><h1>Coding practice</h1><p>Practise common interview patterns with guided JavaScript challenges.</p></div>
        <span className="label-pill"><ShieldCheck size={13}/> Browser practice runner</span>
      </div>
      <div className="coding-layout">
        <aside className="panel challenge-list">
          <div className="coding-panel-heading"><div><h2>Challenges</h2><p>{challenges.length} starter problems</p></div></div>
          {challenges.map((challenge, index) => <button key={challenge.id} className={selectedId === challenge.id ? 'challenge-item selected' : 'challenge-item'} onClick={() => chooseChallenge(challenge.id)}>
            <span className="challenge-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="challenge-copy"><strong>{challenge.title}</strong><small>{challenge.topic}</small></span>
            <span className="difficulty">{challenge.difficulty}</span>
          </button>)}
          <div className="runner-note"><ShieldCheck size={15}/><span>Code runs in a temporary browser worker. It is not a hardened environment for hostile code.</span></div>
        </aside>
        <div className="coding-main">
          <div className="panel challenge-description">
            <div className="coding-panel-heading"><div><span className="eyebrow">{selected.difficulty.toUpperCase()} · {selected.topic.toUpperCase()}</span><h2>{selected.title}</h2></div><button className="btn btn-ghost" onClick={resetCode}><RotateCcw size={14}/> Reset code</button></div>
            <p>{selected.prompt}</p>
            <div className="function-signature"><Code2 size={15}/><code>{selected.signature}</code></div>
            <button className="hint-toggle" onClick={() => setShowHint(value => !value)}>{showHint ? 'Hide hint' : 'Show hint'}</button>
            {showHint && <p className="challenge-hint">{selected.hint}</p>}
          </div>
          <div className="panel editor-panel">
            <div className="editor-toolbar"><span><Code2 size={15}/> solution.js</span><span className="language-chip">JavaScript</span></div>
            <textarea className="code-editor" spellCheck="false" aria-label="JavaScript code editor" value={code} onChange={event => { setCode(event.target.value); setResults(null); }} />
            <div className="editor-footer"><span>JavaScript · {code.split('\n').length} lines</span><div><button className="btn btn-primary" onClick={runCode} disabled={running || !code.trim()}><Play size={14} fill="currentColor"/>{running ? 'Running…' : 'Run tests'}</button></div></div>
          </div>
          <div className="panel test-panel">
            <div className="coding-panel-heading"><div><h2><Terminal size={16}/> Test results</h2><p>{results ? (results.error ? 'Execution error' : `${passed} of ${selected.tests.length} tests passed`) : 'Run your solution to check the sample cases.'}</p></div>{results && !results.error && <span className={passed === selected.tests.length ? 'test-summary passed' : 'test-summary'}>{passed}/{selected.tests.length} passed</span>}</div>
            {results?.error ? <div className="runner-error"><XCircle size={16}/>{results.error}</div> : results?.results ? <div className="test-results">{results.results.map(item => <div className="test-result" key={item.index}><span>{item.passed ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}</span><div><strong>Test case {item.index + 1}</strong><small>{item.error ? item.error : item.passed ? 'Expected output matched.' : `Expected ${JSON.stringify(item.expected)} · Received ${JSON.stringify(item.actual)}`}</small></div><b>{item.passed ? 'Passed' : 'Failed'}</b></div>)}</div> : <div className="empty-tests"><Circle size={16}/> No test results yet</div>}
          </div>
        </div>
      </div>
      <p className="coding-disclaimer">This practice runner supports JavaScript only. Execution is local to your browser tab, with network APIs disabled and a short timeout. Do not paste secrets or run code you do not understand. For production-grade grading, use a separately hardened execution service.</p>
    </section>
  );
}
