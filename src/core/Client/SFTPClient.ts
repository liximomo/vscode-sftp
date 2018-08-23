import { Client } from 'ssh2';
import upath from '../upath';
import RemoteClient, { IClientOption } from './RemoteClient';
import SFTPFileSystem from '../Fs/SFTPFileSystem';
import localFs from '../localFs';
import FileSystem from '../Fs/FileSystem';
import RemoteFileSystem from '../Fs/RemoteFileSystem';

export default class SFTPClient extends RemoteClient {
  private sftp: any;
  private hoppingClients: any[];

  constructor(option?: IClientOption) {
    super(option);
  }

  initClient() {
    return new Client();
  }

  async connect(readline): Promise<void> {
    const { hop, ...option } = this.getOption();

    if (!hop || hop.length <= 0) {
      this.sftp = await this._connectSftpClient(this.client, { ...option, fs: localFs }, readline);
      return;
    }

    const connectOptions = Array.isArray(hop) ? hop.slice() : [hop];
    connectOptions.push(option);
    const isLast = index => connectOptions.length - 1 === index;

    this.hoppingClients = connectOptions.reduce(async (clients, connectOption, index) => {
      const preClient = clients[index - 1];

      let fs: FileSystem | RemoteFileSystem = localFs;
      let sock;
      if (preClient) {
        sock = await this._makeHopping(
          preClient,
          connectOptions[index - 1].port,
          connectOption.host,
          connectOption.port
        );
        fs = new SFTPFileSystem(upath, {});
        (fs as RemoteFileSystem).setClient(preClient);
      }

      if (isLast(index)) {
        this.sftp = await this._connectSftpClient(
          this.client,
          { ...connectOption, sock, fs },
          readline
        );
      } else {
        const client = new Client();
        clients.push(client);
        await this._connectSSHClient(client, { ...connectOption, sock, fs }, readline);
      }

      return clients;
    }, []);
  }

  // connect1(readline): Promise<void> {
  //   const {
  //     interactiveAuth,
  //     password,
  //     privateKeyPath,
  //     connectTimeout,
  //     ...option // tslint:disable-line
  //   } = this.getOption();
  //   return new Promise<void>((resolve, reject) => {
  //     const connectWithCredential = (passwd?, privateKey?) =>
  //       this.client
  //         .on('ready', () => {
  //           this.client.sftp((err, sftp) => {
  //             if (err) {
  //               reject(err);
  //             }

  //             this.sftp = sftp;
  //             resolve();
  //           });
  //         })
  //         .on('error', err => {
  //           reject(err);
  //         })
  //         .connect({
  //           keepaliveInterval: 1000 * 30,
  //           keepaliveCountMax: 2,
  //           readyTimeout: interactiveAuth ? Math.max(60 * 1000, connectTimeout) : connectTimeout,
  //           ...option,
  //           privateKey,
  //           password: passwd,
  //           tryKeyboard: interactiveAuth,
  //         });

  //     if (interactiveAuth) {
  //       this.client.on('keyboard-interactive', function redo(
  //         name,
  //         instructions,
  //         instructionsLang,
  //         prompts,
  //         finish,
  //         stackedAnswers
  //       ) {
  //         const answers = stackedAnswers || [];
  //         if (answers.length < prompts.length) {
  //           readline(prompts[answers.length].prompt).then(answer => {
  //             answers.push(answer);
  //             redo(name, instructions, instructionsLang, prompts, finish, answers);
  //           });
  //         } else {
  //           finish(answers);
  //         }
  //       });
  //     }

  //     if (!privateKeyPath) {
  //       connectWithCredential(password);
  //       return;
  //     }

  //     fs.readFile(privateKeyPath, (err, data) => {
  //       if (err) {
  //         reject(err);
  //         return;
  //       }
  //       connectWithCredential(password, data);
  //     });
  //   });
  // }

  private async _connectSSHClient(
    client,
    connetOption: { fs: FileSystem; [x: string]: any },
    readline
  ): Promise<any> {
    let resolve;
    let reject;
    const promise = new Promise<void>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    const {
      fs,
      interactiveAuth,
      password,
      privateKeyPath,
      connectTimeout,
      ...option // tslint:disable-line
    } = connetOption;
    const connectWithCredential = credentiai =>
      client
        .on('ready', resolve)
        .on('error', reject)
        .connect({
          keepaliveInterval: 1000 * 30,
          keepaliveCountMax: 2,
          readyTimeout: interactiveAuth ? Math.max(60 * 1000, connectTimeout) : connectTimeout,
          ...option,
          ...credentiai,
          tryKeyboard: interactiveAuth,
        });

    if (interactiveAuth) {
      client.on('keyboard-interactive', function redo(
        name,
        instructions,
        instructionsLang,
        prompts,
        finish,
        stackedAnswers
      ) {
        const answers = stackedAnswers || [];
        if (answers.length < prompts.length) {
          readline(prompts[answers.length].prompt).then(answer => {
            answers.push(answer);
            redo(name, instructions, instructionsLang, prompts, finish, answers);
          });
        } else {
          finish(answers);
        }
      });
    }

    if (!privateKeyPath) {
      connectWithCredential({ password });
      return promise;
    }

    const buffer = await fs.readFile(privateKeyPath);
    connectWithCredential({ privateKey: buffer.toString() });

    return promise;
  }

  private _connectSftpClient(client, connetOption, readline): Promise<any> {
    return this._connectSSHClient(client, connetOption, readline).then(() => {
      return new Promise((resolve, reject) => {
        client.sftp((err, sftp) => {
          if (err) {
            reject(err);
          }

          resolve(sftp);
        });
      });
    });
  }

  private _makeHopping(client, srcPort, dstHost, dstPort): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create a connect form 127.0.0.1:port to dstHost:dstPort
      client.forwardOut('127.0.0.1', srcPort, dstHost, dstPort, (error, stream) => {
        if (error) {
          return reject(error);
        }

        resolve(stream);
      });
    });
  }

  end() {
    // todo end hop clients
    this.client.end();

    if (this.hoppingClients) {
      // last connect first end
      this.hoppingClients.reverse().forEach(client => client.end());
    }
  }

  getFsClient() {
    return this.sftp;
  }
}
