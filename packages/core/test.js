const {Subject, Observable} = require('rxjs');


const o = new Observable(o => {
    console.log('started');
    o.complete();
});

const subject = new Subject();
// o.subscribe(subject);

subject.subscribe({
    complete() {
        console.log('c1');
    }
});


subject.subscribe({
    complete() {
        console.log('c2');
    }
});
