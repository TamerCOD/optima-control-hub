async function foo() {
  const obj = {};
  obj.foo.bar(); // TypeError
}
try {
  foo();
  console.log("continued");
} catch (e) {
  console.log("caught synchronously");
}
