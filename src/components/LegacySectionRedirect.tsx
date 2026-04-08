import { useEffect } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/router';

import styled from '@emotion/styled';



type Props = {

  hash: '#faq' | '#bus' | '#qa';

  title: string;

};



const Wrap = styled.main`

  min-height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 24px 16px;

`;



const Card = styled.section`

  width: 100%;

  max-width: 520px;

  padding: 24px 20px;

  border-radius: 20px;

  background: rgba(255, 255, 255, 0.06);

  border: 1px solid rgba(255, 255, 255, 0.08);

  text-align: center;

`;



const Title = styled.h1`

  margin: 0 0 10px;

  font-size: 22px;

`;



const Desc = styled.p`

  margin: 0;

  opacity: 0.82;

  line-height: 1.6;

`;



const BackLink = styled.a`

  display: inline-block;

  margin-top: 16px;

  color: inherit;

  font-weight: 700;

`;



export default function LegacySectionRedirect({ hash, title }: Props) {

  const router = useRouter();



  useEffect(() => {

    router.replace(`/${hash}`);

  }, [hash, router]);



  return (

    <Wrap>

      <Card>

        <Title>{title}</Title>

        <Desc>요청하신 화면은 메인 페이지 안의 섹션으로 통합되었습니다. 잠시 후 자동으로 이동합니다.</Desc>

        <Link href={`/${hash}`} passHref legacyBehavior>

          <BackLink>바로 이동하기</BackLink>

        </Link>

      </Card>

    </Wrap>

  );

}

