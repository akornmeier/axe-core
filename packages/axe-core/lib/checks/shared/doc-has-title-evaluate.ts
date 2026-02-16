import { sanitize } from '../../commons/text';

function docHasTitleEvaluate(): boolean {
  const title = document.title;
  return !!sanitize(title);
}

export default docHasTitleEvaluate;
