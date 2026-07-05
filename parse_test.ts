const studentObj = {
  competitions: ["دراسي", "ألحان"]
};
let compsArr = [];
if (Array.isArray(studentObj.competitions)) {
  compsArr = studentObj.competitions;
} else if (typeof studentObj.competitions === 'string') {
  try { compsArr = JSON.parse(studentObj.competitions); } catch(e) { compsArr = [studentObj.competitions]; }
}
const compNames = compsArr.map(item => typeof item === 'string' ? item : (item.activity || item.competition || item.name || ''));
console.log(compNames);
