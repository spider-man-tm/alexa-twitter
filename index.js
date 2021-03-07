const Alexa = require('ask-sdk-core');
const Twitter = require('twitter');

const CONSUMER_KEY = process.env['CONSUMER_KEY'];
const CONSUMER_SECRET = process.env['CONSUMER_SECRET'];
const ACCESS_TOKEN = process.env['ACCESS_TOKEN'];
const ACCESS_TOKEN_SECRET = process.env['ACCESS_TOKEN_SECRET'];


function tweetPost(content, client) {
  client.post('statuses/update', { status: content }, function (error, tweet, response) {
    if (!error) {
      console.log("tweet success: " + content);
    } else {
      console.log(error);
    }
  })
};


const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'ツイッターにどの様に投稿しますか？';
    const reprompt = 'どの様に投稿しますか？'
    return handlerInput.responseBuilder
      .speak(speechText)
      // 8秒待っても応答がない場合、repromptを話す
      .reprompt(reprompt)
      .getResponse();
  }
};


const PostToTwitterIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PostToTwitterIntent';
  },
  handle(handlerInput) {
    console.log(CONSUMER_KEY);

    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const slots = handlerInput.requestEnvelope.request.intent.slots

    let post = slots.post.value || attributes.post;
    console.log(`post: ${post}`);

    let yes = slots.reply_yes.value || attributes.reply_yes;
    console.log(`yes: ${yes}`);

    let no = slots.reply_no.value || attributes.reply_no;
    console.log(`no: ${no}`);

    // ユーザーの発話でどのスロットにも属さないものはyesやnoのスロットできている
    // ただこれは本来postのスロットに振り分けられて欲しい
    // そこでどのpostの値がない状態で会話が飛んできた場合、自動的にpostになるようにswapする
    if (!post) {
      if (yes) {
        post = yes;
        yes = undefined;
      } else {
        post = no;
        no = undefined;
      }
    }

    if (post) {
      if (yes) {
        // postした内容に対し正しくyes_slotにある言葉で返していた場合処理終了
        if (slots.reply_yes.resolutions.resolutionsPerAuthority[0].status.code === 'ER_SUCCESS_MATCH') {

          let client = new Twitter({
            consumer_key: CONSUMER_KEY,
            consumer_secret: CONSUMER_SECRET,
            access_token_key: ACCESS_TOKEN,
            access_token_secret: ACCESS_TOKEN_SECRET
          });
          tweet_text = post + '（Alexaからの投稿）'
          tweetPost(tweet_text, client)

          const speechText = (`ツイッターに${post}と投稿しました。`);
          console.log(speechText);
          return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
        } else {
          // postした内容にyes or noで回答しなかった場合
          // その内容をpostに代入して再度yes or noをヒアリング
          post = yes;
          attributes.post = post;
          attributes.yes = undefined;
          handlerInput.attributesManager.setSessionAttributes(attributes);
          const speechText = `${post}と投稿します。よろしいですか？`;
          const reprompt = speechText;
          console.log(speechText);
          return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(reprompt)
            .getResponse();
        }

      } else if (no) {
        // 一度post変数をリセットし、Alexaへリターン
        attributes.post = undefined;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        const speechText = 'ツイッターにどの様に投稿しますか？';
        const reprompt = 'どの様に投稿しますか？'
        console.log(speechText);
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(reprompt)
          .getResponse();
      } else {
        // yes or no の返答がなく既にpostが存在する場合、ユーザー側へ承認の確認
        attributes.post = post;
        handlerInput.attributesManager.setSessionAttributes(attributes);
        const speechText = `${post}と投稿します。よろしいですか？`;
        const reprompt = speechText;
        console.log(speechText);
        return handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(reprompt)
          .getResponse();
      }
    } else {
      // postが存在しない場合
      const speechText = 'ツイッターにどの様に投稿しますか？';
      const reprompt = 'どの様に投稿しますか？'
      console.log(speechText);
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(reprompt)
        .getResponse();
    }
  }
};


const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);
    const speakOutput = `すみません、なんだかうまく行かないみたいです。あとでもう一度言ってみてください。`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};


exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PostToTwitterIntentHandler,
  )
  .addErrorHandlers(
    ErrorHandler,
  )
  .lambda();
