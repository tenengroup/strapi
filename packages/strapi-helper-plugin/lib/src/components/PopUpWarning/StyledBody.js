import styled from 'styled-components';
import { ModalBody } from 'reactstrap';

const StyledBody = styled(ModalBody)`
  padding: 16px 30px 15px 30px !important;

  .modalBodyContainerHelper {
    padding: 0.1rem;
    color: #f64d0a;
    text-align: center;
    font-family: Lato;
    font-size: 1.3rem;

    > img {
      width: 2.5rem;
      margin-bottom: 1.5rem;
    }

    > p {
      line-height: 1.8rem;
    }
  }

  .popUpWarningButtonContainer {
    display: flex;
    width: 100%;
    margin-top: 37px;
    justify-content: space-between;

    > button {
      position: relative;
      height: 3rem;
      width: 15rem;
      border-radius: 0.3rem;
      background-color: transparent;
      text-transform: capitalize;
      font-family: Lato;
      cursor: pointer;

      > i,
      svg {
        margin-right: 1.3rem;
      }

      &:focus {
        outline: 0;
      }
      &:hover {
        &::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 0.3rem;
          background: #ffffff;
          opacity: 0.1;
        }
      }
    }
  }

  .primary {
    border: none !important;
    background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
    color: white !important;
    font-weight: 500;

    &:active,
    &:focus,
    &:hover {
      border: none;
      background-color: transparent;
      background: linear-gradient(315deg, #0097f6 0%, #005eea 100%);
      box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.15);
    }
    -webkit-font-smoothing: antialiased;
  }

  .secondary {
    position: relative;
    border: 0.1rem solid #f64d0a !important;
    border-radius: 3px;
    color: #f64d0a !important;
    overflow: hidden;

    &:active {
      border: 0.15rem solid #f64d0a;
    }

    &:focus,
    &:hover {
      border: 0.1rem solid #f64d0a;
      background-color: transparent !important;
      color: #f64d0a;
    }
  }
`;

export default StyledBody;
