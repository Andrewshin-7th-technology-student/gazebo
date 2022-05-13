import cs from 'classnames'
import PropTypes from 'prop-types'

import { LINE_STATE, LINE_TYPE } from 'shared/utils/fileviewerLines'

const classNamePerLineState = {
  [LINE_STATE.COVERED]:
    'bg-ds-coverage-covered border-ds-primary-green border-r-2',
  [LINE_STATE.UNCOVERED]:
    'bg-ds-coverage-uncovered border-ds-primary-red border-r-2',
  [LINE_STATE.BLANK]: 'border-ds-gray-tertiary border-r',
  [LINE_STATE.PARTIAL]:
    'bg-ds-coverage-partial border-ds-primary-yellow border-r-2',
}

const lineStateToLabel = {
  [LINE_STATE.COVERED]: 'covered line of code',
  [LINE_STATE.UNCOVERED]: 'uncovered line of code',
  [LINE_STATE.BLANK]: 'line of code',
  [LINE_STATE.PARTIAL]: 'partial line of code',
}

// Enum from https://github.com/codecov/shared/blob/master/shared/utils/merge.py#L275-L279
function getLineState({ coverage, showLines }) {
  const { showCovered, showUncovered, showPartial } = showLines
  return coverage
    ? {
        [LINE_TYPE.HIT]: showCovered ? LINE_STATE.COVERED : LINE_STATE.BLANK,
        [LINE_TYPE.MISS]: showUncovered
          ? LINE_STATE.UNCOVERED
          : LINE_STATE.BLANK,
        [LINE_TYPE.PARTIAL]: showPartial
          ? LINE_STATE.PARTIAL
          : LINE_STATE.BLANK,
      }[coverage]
    : LINE_STATE.BLANK
}

function DiffLine({ showLines, segmentLine, rendererLine, getTokenProps }) {
  const { headNumber, baseNumber, headCoverage, baseCoverage } = segmentLine

  const baseLineState = getLineState({ coverage: baseCoverage, showLines })
  const headLineState = getLineState({ coverage: headCoverage, showLines })

  return (
    <tr data-testid="fv-single-line">
      <td
        aria-label={lineStateToLabel[baseLineState]}
        className={cs(
          'line-number text-ds-gray-quaternary font-mono text-right border-solid px-2 select-none',
          classNamePerLineState[baseLineState]
        )}
      >
        {baseNumber}
      </td>
      <td
        aria-label={lineStateToLabel[headLineState]}
        className={cs(
          'line-number text-ds-gray-quaternary font-mono text-right border-solid px-2 select-none',
          classNamePerLineState[headLineState]
        )}
      >
        {headNumber}
      </td>
      {/* Figure out a way to make this overwrite the token.operator class */}
      <td className="pl-2 break-all first-letter:mr-2 bg-ds-gray-secondary">
        {rendererLine.map((token, key) => (
          <span key={key} {...getTokenProps({ token, key })} />
        ))}
      </td>
    </tr>
  )
}

DiffLine.propTypes = {
  rendererLine: PropTypes.array.isRequired,
  coverage: PropTypes.oneOf(Object.values(LINE_TYPE)),
  showLines: PropTypes.shape({
    showCovered: PropTypes.bool.isRequired,
    showUncovered: PropTypes.bool.isRequired,
    showPartial: PropTypes.bool.isRequired,
  }),
  number: PropTypes.number.isRequired,
  getLineProps: PropTypes.func,
  getTokenProps: PropTypes.func,
}

export default DiffLine
