const query = document.querySelector('#query');
const department = document.querySelector('#department');
const type = document.querySelector('#type');
const results = document.querySelector('#results');
const count = document.querySelector('#count');
const more = document.querySelector('#more');
const pageSize = 24;
const coursesByCode = new Map();
let limit = pageSize;

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function searchable(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function showCourse(course, reviews) {
  const card = document.createElement('details');
  const summary = document.createElement('summary');
  summary.append(element('span', course.code, 'code'));
  if (course.title) summary.append(element('span', course.title, 'course-title'));
  summary.append(element('span', `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`, 'review-count'));
  card.append(summary);
  for (const review of reviews) {
    const article = document.createElement('article');
    const reviewer = review.reviewer?.trim();
    article.append(element('h3', reviewer ? `Reviewed by ${reviewer}` : 'Reviewer name not provided'));
    if (review.instructor) article.append(element('small', `Instructor: ${review.instructor}`));
    const metadata = [[review.term, review.year].filter(Boolean).join(' '), ...review.types].filter(Boolean);
    if (metadata.length) article.append(element('small', metadata.join(' · ')));
    article.append(element('p', review.review));
    card.append(article);
  }
  return card;
}

function render() {
  const terms = query.value.trim().split(/\s+/).map(searchable).filter(Boolean);
  const matches = [];
  let reviewCount = 0;
  for (const course of coursesByCode.values()) {
    if (department.value && department.value !== course.department) continue;
    const reviews = course.reviews.filter(review =>
      (!type.value || review.types.includes(type.value)) &&
      terms.every(term => review.search.includes(term))
    );
    if (!reviews.length) continue;
    matches.push({ course, reviews });
    reviewCount += reviews.length;
  }

  count.textContent = `${matches.length} ${matches.length === 1 ? 'course' : 'courses'} · ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`;
  results.replaceChildren(...matches.slice(0, limit).map(({course, reviews}) => showCourse(course, reviews)));
  if (!matches.length) results.append(element('p', coursesByCode.size ? 'No matching courses. Try another search or clear the filters.' : 'No reviews have been added yet.'));
  more.hidden = matches.length <= limit;
}

function start(reviews) {
  const collator = new Intl.Collator(undefined, {numeric:true});
  reviews.sort((a, b) => collator.compare(a.code, b.code));
  for (const review of reviews) {
    const courseDepartment = review.code.match(/^[A-Z]+(?=\s+\d)/)?.[0] || 'Other';
    if (!coursesByCode.has(review.code)) coursesByCode.set(review.code, {
      code:review.code, department:courseDepartment, title:'', reviews:[],
    });
    const course = coursesByCode.get(review.code);
    if (review.title && !course.title) course.title = review.title;
    course.reviews.push(review);
  }
  const departments = [...new Set([...coursesByCode.values()].map(course => course.department))].sort();
  for (const name of departments) department.add(new Option(name, name));
  for (const course of coursesByCode.values()) {
    for (const review of course.reviews) {
      review.search = searchable([course.code, course.title, review.title, review.instructor].join(' '));
    }
  }
  document.querySelector('#total-courses').textContent = coursesByCode.size;
  document.querySelector('#total-reviews').textContent = reviews.length;
  document.querySelector('#filters').addEventListener('submit', event => event.preventDefault());
  for (const control of [query, department, type]) control.addEventListener('input', () => {
    limit = pageSize;
    render();
  });
  more.addEventListener('click', () => {
    const previousLimit = limit;
    limit += pageSize;
    render();
    results.children[previousLimit]?.querySelector('summary').focus();
  });
  render();
}

const unlock = document.querySelector('#unlock');
const password = document.querySelector('#password');
const unlockStatus = document.querySelector('#unlock-status');
const submit = unlock.querySelector('button');

unlock.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  unlockStatus.textContent = 'Unlocking reviews…';
  try {
    const response = await fetch('https://ot-penn-course-reviews.tweedyode3.chatgpt.site/pages-reviews', {
      method: 'POST',
      body: new URLSearchParams({password: password.value}),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    if (response.status === 401) {
      unlockStatus.textContent = 'Incorrect password. Try again.';
      password.select();
      return;
    }
    if (!response.ok) throw new Error('Unable to load reviews');
    start(await response.json());
    unlock.reset();
    unlock.hidden = true;
    document.querySelector('#browse').hidden = false;
    document.querySelector('#stats').hidden = false;
    query.focus();
  } catch {
    unlockStatus.textContent = 'The reviews could not be loaded. Try again in a moment.';
  } finally {
    submit.disabled = false;
  }
});
