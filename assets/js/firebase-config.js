const firebaseConfig = {
  apiKey: "AIzaSyCTJULZqnoyaOytjRG0Cxor93-nwfhmXdU",
  authDomain: "zero-warn.firebaseapp.com",
  projectId: "zero-warn",
  storageBucket: "zero-warn.firebasestorage.app",
  messagingSenderId: "496636032803",
  appId: "1:496636032803:web:72bef502f60702b96bbe96",
  measurementId: "G-2T35VBNDQB"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const dbx = {
  blog: db.collection('blog_posts'),
  videos: db.collection('videos'),
  forumCategories: db.collection('forum_categories'),
  forumThreads: db.collection('forum_threads'),
  forumReplies: db.collection('forum_replies'),
  blogCategories: db.collection('blog_categories'),
  settings: db.collection('site_settings')
};
