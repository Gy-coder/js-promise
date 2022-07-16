Promise.all2 = function (arr) {
  const promises = [...arr].map((v) =>
    v instanceof Promise ? v : Promise.resolve(v)
  );
  return new Promise((resolve, reject) => {
    const res = [];
    let count = 0;
    const len = promises.length;
    for (let i = 0; i < promises.length; i++) {
      promises[i].then(
        (result) => {
          count += 1;
          res[i] = result;
          if (count === promises.length) resolve(res);
        },
        (reason) => {
          reject(reason);
        }
      );
    }
  });
};

{
  Promise.all2([
    new Promise((resolve) => setTimeout(() => resolve(1), 3000)), // 1
    new Promise((resolve) => setTimeout(() => resolve(2), 2000)), // 2
    new Promise((resolve) => setTimeout(() => resolve(3), 1000)), // 3
    5,
  ]).then((result) => {
    console.log('1', result);
  });

  Promise.all2([
    new Promise((resolve, reject) => setTimeout(() => resolve(1), 1000)),
    new Promise((resolve, reject) => setTimeout(() => reject('Whoops!'), 2000)),
    new Promise((resolve, reject) => setTimeout(() => resolve(3), 3000)),
  ]).then(
    (result) => {
      console.log('2', result);
    },
    (reason) => console.log('4', reason)
  );
}

Promise.allSettled2 = function (arr) {
  const promises = [...arr].map((v) =>
    v instanceof Promise ? v : Promise.resolve(v)
  );
  return new Promise((resolve, reject) => {
    const res = [];
    const len = promises.length;
    const count = 0;
    for (let i = 0; i < promises.length; i++) {
      promises[i].then(
        (result) => {
          count += 1;
          res[i] = { status: 'fulfilled', value: result };
          if (count === len) resolve(res);
        },
        (reason) => {
          count += 1;
          res[i] = { status: 'rejected', reason: reason };
          if (count === len) resolve(res);
        }
      );
    }
  });
};

{
  // p1：立即成功
  const p1 = Promise.resolve('p1_success');
  // p2：2 秒后成功
  const p2 = new Promise((resolve, reject) =>
    setTimeout(resolve, 2000, 'p2_success')
  );
  // p3：1 秒后失败
  const p3 = new Promise((resolve, reject) =>
    setTimeout(reject, 1000, 'p3_success')
  );

  Promise.allSettled2([p1, p2, p3, 1]).then((results) =>
    results.forEach((result) => console.log(result))
  );
}

class myPromise {
  status = 'pending';
  callback = []; // [{onFulFilled,onRejected}]
  constructor(fn) {
    if (typeof fn !== 'function') throw new Error();
    fn(this.resolve.bind(this), this.reject.bind(this));
  }
  resolve(result) {
    if (this.status !== 'pending') return;
    this.status = 'fulfilled';
    queueMicrotask(() => {
      this.callback.forEach((handle) => {
        if (typeof handle.onFulFilled === 'function') {
          handle.onFulFilled.call(null, result);
        }
      });
    });
  }
  reject(reason) {
    if (this.status !== 'pending') return;
    this.status = 'rejected';
    queueMicrotask(() => {
      this.callback.forEach((handle) => {
        if (typeof handle.onRejected === 'function') {
          handle.onRejected.call(null, reason);
        }
      });
    });
  }
  then(onFulFilled, onRejected) {
    const handle = { onFulFilled: undefined, onRejected: undefined };
    if (typeof onFulFilled === 'function') {
      handle.onFulFilled = onFulFilled;
    }
    if (typeof onRejected === 'function') {
      handle.onRejected = onFulFilled;
    }
    this.callback.push(handle);
  }
}

let p = new myPromise((resolve) => {
  resolve('result');
});

p.then((result) => {
  console.log(result, 'p1');
});

let p2 = new myPromise((resolve, reject) => {
  reject('rejected');
});

p2.then(
  (result) => {
    console.log(result, 'p2');
  },
  (reason) => {
    console.log(reason, 'p2');
  }
);

console.log('my promise');

async function asyncPool(limit, arr, fn) {
  const res = [];
  const exec = [];
  for (let i = 0; i < arr.length; i++) {
    const p = fn(arr[i]);
    res.push(arr[i]);
    if (limit <= arr.length) {
      const e = p.then(() => {
        console.log(`正在执行。 exec长度: ${exec.length}`);
        exec.splice(exec.indexOf(e), 1);
      });
      exec.push(e);
      if (exec.length >= limit) {
        await Promise.race(exec);
      }
    }
  }
  return Promise.all(res);
}

const request = (i) => {
  console.log(`开始${i}`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(i);
      console.log(`结束${i}`);
    }, 1000 + Math.random() * 1000);
  });
};

const urls = new Array(30).fill(0).map((v, i) => i);

console.log(urls);

(async () => {
  const res = await asyncPool(3, urls, request);
  console.log(res);
})();
